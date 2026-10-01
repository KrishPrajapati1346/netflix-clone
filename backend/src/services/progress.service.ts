import { Types } from 'mongoose';
import {
  RESUME_MIN_THRESHOLD,
  type ContinueWatchingItemDTO,
  type EpisodeSummaryDTO,
  type MediaType,
  type ProgressDTO,
  type ProgressUpdateInput,
} from '@shared';
import { Episode } from '../models/Episode';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { TVShow } from '../models/TVShow';
import { WatchProgress, isComplete, progressPercent, type WatchProgressAttrs } from '../models/WatchProgress';
import { toSummary } from './catalog.service';

/**
 * Playback progress.
 *
 * The player posts here every few seconds, so this is the hottest write path in
 * the app. Each save is a single indexed upsert with no read-modify-write, which
 * keeps it cheap and makes concurrent saves from two tabs safe.
 */

export function toProgressDTO(doc: WatchProgressAttrs): ProgressDTO {
  return {
    mediaType: doc.mediaType,
    mediaId: doc.mediaId.toString(),
    episodeId: doc.episodeId ? doc.episodeId.toString() : null,
    positionSeconds: Math.round(doc.positionSeconds),
    durationSeconds: Math.round(doc.durationSeconds),
    percent: progressPercent(doc),
    completed: doc.completed,
    updatedAt: doc.lastWatchedAt.toISOString(),
  };
}

export async function saveProgress(
  profile: ProfileDocument,
  input: ProgressUpdateInput,
): Promise<ProgressDTO> {
  const completed = isComplete(input.positionSeconds, input.durationSeconds);

  const doc = await WatchProgress.findOneAndUpdate(
    {
      profileId: profile._id,
      mediaType: input.mediaType,
      mediaId: new Types.ObjectId(input.mediaId),
      episodeId: input.episodeId ? new Types.ObjectId(input.episodeId) : null,
    },
    {
      $set: {
        userId: profile.userId,
        positionSeconds: input.positionSeconds,
        durationSeconds: input.durationSeconds,
        completed,
        lastWatchedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return toProgressDTO(doc);
}

export async function getProgressFor(
  profileId: Types.ObjectId,
  mediaType: MediaType,
  mediaId: Types.ObjectId,
  episodeId?: Types.ObjectId | null,
): Promise<ProgressDTO | null> {
  const doc = await WatchProgress.findOne({
    profileId,
    mediaType,
    mediaId,
    episodeId: episodeId ?? null,
  }).lean();

  return doc ? toProgressDTO(doc) : null;
}

/** Progress for many titles at once, keyed by `mediaId` — avoids N+1 in rows. */
export async function getProgressMap(
  profileId: Types.ObjectId,
  mediaIds: Types.ObjectId[],
): Promise<Map<string, ProgressDTO>> {
  if (mediaIds.length === 0) return new Map();

  const rows = await WatchProgress.find({ profileId, mediaId: { $in: mediaIds } })
    .sort({ lastWatchedAt: -1 })
    .lean();

  const map = new Map<string, ProgressDTO>();
  for (const row of rows) {
    // Sorted newest-first, so the first row per title is the most recent.
    const key = row.mediaId.toString();
    if (!map.has(key)) map.set(key, toProgressDTO(row));
  }
  return map;
}

/**
 * Every episode's progress for one series, keyed by episode id.
 *
 * One query for the whole season list. Fetching per episode would be an N+1
 * that scales with season length — a 24-episode season becoming 24 round trips
 * to render a single list.
 */
export async function getEpisodeProgressMap(
  profileId: Types.ObjectId,
  showId: Types.ObjectId,
): Promise<Map<string, ProgressDTO>> {
  const rows = await WatchProgress.find({ profileId, mediaType: 'tv', mediaId: showId }).lean();

  const map = new Map<string, ProgressDTO>();
  for (const row of rows) {
    if (row.episodeId) map.set(row.episodeId.toString(), toProgressDTO(row));
  }
  return map;
}

/**
 * The Continue Watching row.
 *
 * Excludes anything finished, and anything barely started — a title someone
 * opened for ten seconds and abandoned is noise, not a resume point.
 */
export async function getContinueWatching(
  profile: ProfileDocument,
  limit = 20,
): Promise<ContinueWatchingItemDTO[]> {
  const rows = await WatchProgress.find({ profileId: profile._id, completed: false })
    .sort({ lastWatchedAt: -1 })
    .limit(limit * 2)
    .lean();

  const meaningful = rows.filter((row) => progressPercent(row) >= RESUME_MIN_THRESHOLD);
  if (meaningful.length === 0) return [];

  const movieIds = meaningful.filter((r) => r.mediaType === 'movie').map((r) => r.mediaId);
  const showIds = meaningful.filter((r) => r.mediaType === 'tv').map((r) => r.mediaId);
  const episodeIds = meaningful.map((r) => r.episodeId).filter((id): id is Types.ObjectId => Boolean(id));

  const allowed = profile.allowedRatings();

  // Three bulk queries regardless of row count, rather than one per row.
  const [movies, shows, episodes] = await Promise.all([
    movieIds.length
      ? Movie.find({ _id: { $in: movieIds }, isPublished: true, maturityRating: { $in: allowed } }).lean()
      : [],
    showIds.length
      ? TVShow.find({ _id: { $in: showIds }, isPublished: true, maturityRating: { $in: allowed } }).lean()
      : [],
    episodeIds.length ? Episode.find({ _id: { $in: episodeIds } }).lean() : [],
  ]);

  const movieMap = new Map(movies.map((m) => [m._id.toString(), m]));
  const showMap = new Map(shows.map((s) => [s._id.toString(), s]));
  const episodeMap = new Map(episodes.map((e) => [e._id.toString(), e]));

  const items: ContinueWatchingItemDTO[] = [];
  const seenShows = new Set<string>();

  for (const row of meaningful) {
    const key = row.mediaId.toString();

    if (row.mediaType === 'movie') {
      const movie = movieMap.get(key);
      // Absent means unpublished or outside this profile's maturity limit.
      if (!movie) continue;
      items.push({
        title: toSummary({ ...movie, mediaType: 'movie' } as never),
        episode: null,
        progress: toProgressDTO(row),
      });
    } else {
      // A series appears once, at its most recent episode — not once per episode.
      if (seenShows.has(key)) continue;
      const show = showMap.get(key);
      if (!show) continue;
      const episode = row.episodeId ? episodeMap.get(row.episodeId.toString()) : undefined;
      if (!episode) continue;

      seenShows.add(key);
      items.push({
        title: toSummary({
          ...show,
          mediaType: 'tv',
          releaseDate: show.firstAirDate ?? null,
          runtimeMinutes: show.averageRuntimeMinutes || null,
        } as never),
        episode: toEpisodeSummary(episode, toProgressDTO(row)),
        progress: toProgressDTO(row),
      });
    }

    if (items.length >= limit) break;
  }

  return items;
}

export function toEpisodeSummary(
  episode: {
    _id: Types.ObjectId;
    showId: Types.ObjectId;
    seasonId: Types.ObjectId;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    overview: string;
    stillUrl?: string | null;
    runtimeMinutes: number;
    airDate?: Date | null;
  },
  progress: ProgressDTO | null = null,
): EpisodeSummaryDTO {
  return {
    id: episode._id.toString(),
    showId: episode.showId.toString(),
    seasonId: episode.seasonId.toString(),
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    overview: episode.overview,
    stillUrl: episode.stillUrl ?? null,
    runtimeMinutes: episode.runtimeMinutes,
    airDate: episode.airDate ? episode.airDate.toISOString() : null,
    progress,
  };
}

/**
 * The episode a viewer should be offered next for a series.
 *
 * Resumes the most recent unfinished episode; if that one is finished, advances
 * to the next in broadcast order; and falls back to the very first episode for
 * someone who has never watched the show.
 */
export async function resolveNextEpisode(
  profileId: Types.ObjectId,
  showId: Types.ObjectId,
): Promise<{ episode: EpisodeSummaryDTO; progress: ProgressDTO | null } | null> {
  const latest = await WatchProgress.findOne({ profileId, mediaType: 'tv', mediaId: showId })
    .sort({ lastWatchedAt: -1 })
    .lean();

  if (!latest?.episodeId) {
    const first = await Episode.findOne({ showId, isPublished: true })
      .sort({ seasonNumber: 1, episodeNumber: 1 })
      .lean();
    return first ? { episode: toEpisodeSummary(first), progress: null } : null;
  }

  const current = await Episode.findById(latest.episodeId).lean();
  if (!current) return null;

  if (!latest.completed) {
    return { episode: toEpisodeSummary(current, toProgressDTO(latest)), progress: toProgressDTO(latest) };
  }

  const next = await Episode.findOne({
    showId,
    isPublished: true,
    $or: [
      { seasonNumber: current.seasonNumber, episodeNumber: { $gt: current.episodeNumber } },
      { seasonNumber: { $gt: current.seasonNumber } },
    ],
  })
    .sort({ seasonNumber: 1, episodeNumber: 1 })
    .lean();

  // No next episode means the viewer finished the series.
  return next ? { episode: toEpisodeSummary(next), progress: null } : null;
}

export async function getWatchHistory(
  profile: ProfileDocument,
  page: number,
  limit: number,
): Promise<{ rows: WatchProgressAttrs[]; total: number }> {
  const filter = { profileId: profile._id };
  const [rows, total] = await Promise.all([
    WatchProgress.find(filter)
      .sort({ lastWatchedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WatchProgress.countDocuments(filter),
  ]);
  return { rows, total };
}

export async function clearProgress(
  profileId: Types.ObjectId,
  mediaId: Types.ObjectId,
): Promise<number> {
  const result = await WatchProgress.deleteMany({ profileId, mediaId });
  return result.deletedCount;
}
