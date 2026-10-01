import { Types } from 'mongoose';
import type {
  CreateEpisodeInput,
  CreateMovieInput,
  CreateSeasonInput,
  CreateShowInput,
  MediaType,
  Paginated,
  UpdateEpisodeInput,
  UpdateMovieInput,
  UpdateSeasonInput,
  UpdateShowInput,
  UserRole,
} from '@shared';
import { Episode } from '../models/Episode';
import { ListEntry } from '../models/ListEntry';
import { Movie } from '../models/Movie';
import { Profile } from '../models/Profile';
import { Rating, Reaction } from '../models/Rating';
import { Review } from '../models/Review';
import { Season } from '../models/Season';
import { TVShow } from '../models/TVShow';
import { User } from '../models/User';
import { WatchProgress } from '../models/WatchProgress';
import { ApiError } from '../utils/ApiError';
import { paginate } from '../utils/http';
import { uniqueSlug } from '../utils/slug';

/**
 * Admin operations.
 *
 * Every mutation here changes what viewers see immediately — there is no build
 * step or cache to invalidate, because the catalog is read from the database on
 * request. That is what makes "add a title and see it live without a redeploy"
 * true rather than aspirational.
 */

/* ------------------------------------------------------------------ movies */

export async function createMovie(input: CreateMovieInput) {
  const slug =
    input.slug ??
    (await uniqueSlug(input.title, async (candidate) => Boolean(await Movie.exists({ slug: candidate }))));

  return Movie.create({ ...input, slug });
}

export async function updateMovie(id: string, input: UpdateMovieInput) {
  const movie = await Movie.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!movie) throw ApiError.notFound('Movie not found', 'MOVIE_NOT_FOUND');
  return movie;
}

export async function deleteMovie(id: string): Promise<void> {
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) throw ApiError.notFound('Movie not found', 'MOVIE_NOT_FOUND');
  await cascadeTitleDeletion('movie', movie._id);
}

/* ------------------------------------------------------------------- shows */

export async function createShow(input: CreateShowInput) {
  const slug =
    input.slug ??
    (await uniqueSlug(input.title, async (candidate) => Boolean(await TVShow.exists({ slug: candidate }))));

  return TVShow.create({ ...input, slug });
}

export async function updateShow(id: string, input: UpdateShowInput) {
  const show = await TVShow.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!show) throw ApiError.notFound('Series not found', 'SHOW_NOT_FOUND');
  return show;
}

export async function deleteShow(id: string): Promise<void> {
  const show = await TVShow.findByIdAndDelete(id);
  if (!show) throw ApiError.notFound('Series not found', 'SHOW_NOT_FOUND');

  // A series owns its seasons and episodes; deleting it must not leave them
  // orphaned and unreachable.
  await Promise.all([
    Season.deleteMany({ showId: show._id }),
    Episode.deleteMany({ showId: show._id }),
  ]);
  await cascadeTitleDeletion('tv', show._id);
}

/* ----------------------------------------------------------------- seasons */

export async function createSeason(input: CreateSeasonInput) {
  const season = await Season.create(input);
  await recountShow(new Types.ObjectId(input.showId));
  return season;
}

export async function updateSeason(id: string, input: UpdateSeasonInput) {
  const season = await Season.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!season) throw ApiError.notFound('Season not found', 'SEASON_NOT_FOUND');
  return season;
}

export async function deleteSeason(id: string): Promise<void> {
  const season = await Season.findByIdAndDelete(id);
  if (!season) throw ApiError.notFound('Season not found', 'SEASON_NOT_FOUND');

  await Episode.deleteMany({ seasonId: season._id });
  await recountShow(season.showId);
}

/* ---------------------------------------------------------------- episodes */

export async function createEpisode(input: CreateEpisodeInput) {
  const episode = await Episode.create(input);
  await recountShow(new Types.ObjectId(input.showId));
  return episode;
}

export async function updateEpisode(id: string, input: UpdateEpisodeInput) {
  const episode = await Episode.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
  if (!episode) throw ApiError.notFound('Episode not found', 'EPISODE_NOT_FOUND');
  await recountShow(episode.showId);
  return episode;
}

export async function deleteEpisode(id: string): Promise<void> {
  const episode = await Episode.findByIdAndDelete(id);
  if (!episode) throw ApiError.notFound('Episode not found', 'EPISODE_NOT_FOUND');
  await recountShow(episode.showId);
}

/**
 * Recomputes a series' denormalised counters.
 *
 * `seasonCount`, `episodeCount` and `averageRuntimeMinutes` are stored on the
 * show so browse queries never join. Any structural edit invalidates them, so
 * they are recomputed here rather than incremented — a recount cannot drift,
 * an increment can.
 */
async function recountShow(showId: Types.ObjectId): Promise<void> {
  const [seasonCount, episodes] = await Promise.all([
    Season.countDocuments({ showId }),
    Episode.find({ showId }).select('runtimeMinutes').lean(),
  ]);

  const totalRuntime = episodes.reduce((sum, episode) => sum + episode.runtimeMinutes, 0);

  await TVShow.updateOne(
    { _id: showId },
    {
      $set: {
        seasonCount,
        episodeCount: episodes.length,
        averageRuntimeMinutes: episodes.length ? Math.round(totalRuntime / episodes.length) : 0,
      },
    },
  );

  // Season-level episode counts, kept in the same pass.
  const seasons = await Season.find({ showId }).select('seasonNumber').lean();
  await Promise.all(
    seasons.map(async (season) =>
      Season.updateOne(
        { _id: season._id },
        { $set: { episodeCount: await Episode.countDocuments({ seasonId: season._id }) } },
      ),
    ),
  );
}

/**
 * Removes viewer state that pointed at a deleted title.
 *
 * Without this, a profile's Continue Watching row would reference a title that
 * no longer resolves, and every list query would have to defend against nulls.
 */
async function cascadeTitleDeletion(mediaType: MediaType, mediaId: Types.ObjectId): Promise<void> {
  await Promise.all([
    WatchProgress.deleteMany({ mediaType, mediaId }),
    ListEntry.deleteMany({ mediaType, mediaId }),
    Rating.deleteMany({ mediaType, mediaId }),
    Reaction.deleteMany({ mediaType, mediaId }),
    Review.deleteMany({ mediaType, mediaId }),
  ]);
}

/* -------------------------------------------------------------------- users */

export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  profileCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export async function listUsers(
  page: number,
  limit: number,
  search?: string,
): Promise<Paginated<AdminUserDTO>> {
  const filter: Record<string, unknown> = {};

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { email: { $regex: escaped, $options: 'i' } },
      { name: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // One grouped query for profile counts rather than one per user.
  const counts = await Profile.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { userId: { $in: rows.map((row) => row._id) } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row) => [row._id.toString(), row.count]));

  return paginate(
    rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
      email: row.email,
      role: row.role,
      isEmailVerified: row.isEmailVerified,
      profileCount: countMap.get(row._id.toString()) ?? 0,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  );
}

export async function setUserRole(
  actingUserId: Types.ObjectId,
  targetUserId: string,
  role: UserRole,
): Promise<void> {
  if (actingUserId.toString() === targetUserId) {
    // Locking yourself out of the admin panel is not a recoverable mistake
    // through the UI, so it is refused rather than confirmed.
    throw ApiError.badRequest('You cannot change your own role', 'SELF_ROLE_CHANGE');
  }

  const user = await User.findById(targetUserId);
  if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

  if (user.role === 'admin' && role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw ApiError.badRequest('There must be at least one administrator', 'LAST_ADMIN');
    }
  }

  user.role = role;
  await user.save();

  // A demotion must take effect immediately, not when their token expires.
  const { revokeAllForUser } = await import('./token.service');
  await revokeAllForUser(user._id, 'logout_all');
}

/* -------------------------------------------------------------- moderation */

export interface ReportedReviewDTO {
  id: string;
  title: string;
  body: string;
  score: number;
  isHidden: boolean;
  authorName: string;
  mediaId: string;
  createdAt: string;
}

/**
 * Reviews awaiting moderation.
 *
 * Sorted by how much reach they have — a hidden-worthy review with 40 helpful
 * votes is doing more damage than one nobody has seen.
 */
export async function listModerationQueue(limit = 50): Promise<ReportedReviewDTO[]> {
  const rows = await Review.find()
    .sort({ isHidden: 1, helpfulCount: -1, createdAt: -1 })
    .limit(limit)
    .populate<{ profileId: { name: string } }>('profileId', 'name')
    .lean();

  return rows.map((row) => ({
    id: row._id.toString(),
    title: row.title,
    body: row.body,
    score: row.score,
    isHidden: row.isHidden,
    authorName: (row.profileId as unknown as { name?: string })?.name ?? 'Deleted profile',
    mediaId: row.mediaId.toString(),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function setReviewHidden(reviewId: string, isHidden: boolean): Promise<void> {
  const review = await Review.findByIdAndUpdate(reviewId, { $set: { isHidden } });
  if (!review) throw ApiError.notFound('Review not found', 'REVIEW_NOT_FOUND');
}

/* ---------------------------------------------------------------- catalog */

/** The admin catalog table: both collections, newest first, with drafts included. */
export async function listCatalog(page: number, limit: number, search?: string) {
  const filter: Record<string, unknown> = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }

  const pipeline = [
    { $match: filter },
    { $addFields: { mediaType: 'movie' } },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [{ $match: filter }, { $addFields: { mediaType: 'tv' } }],
      },
    },
    { $sort: { createdAt: -1, _id: 1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await Movie.aggregate(pipeline as never);
  const items = (result?.items ?? []) as Array<Record<string, unknown>>;
  const total = (result?.total?.[0]?.count as number | undefined) ?? 0;

  return paginate(
    items.map((row) => ({
      id: String(row._id),
      mediaType: row.mediaType as MediaType,
      title: row.title as string,
      slug: row.slug as string,
      isPublished: Boolean(row.isPublished),
      isFeatured: Boolean(row.isFeatured),
      maturityRating: row.maturityRating as string,
      genres: (row.genres ?? []) as string[],
      averageScore: (row.averageScore as number) ?? 0,
      popularity: (row.popularity as number) ?? 0,
      // `sources` lives on episodes for a series, so a show never reports one.
      hasSources: Array.isArray(row.sources) ? row.sources.length > 0 : false,
    })),
    total,
    page,
    limit,
  );
}
