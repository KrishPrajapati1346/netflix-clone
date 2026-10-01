import { Types } from 'mongoose';
import type { ListKind, ListMutationInput, MediaType, TitleSummaryDTO } from '@shared';
import { ListEntry } from '../models/ListEntry';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { Reaction } from '../models/Rating';
import { TVShow } from '../models/TVShow';
import { toSummary } from './catalog.service';

/**
 * Saved lists (My List, Favourites, Watch Later) and thumbs reactions.
 *
 * Every function takes a profile and filters on it, so one household member's
 * lists are structurally unreachable from another's session.
 */

export async function addToList(
  profile: ProfileDocument,
  input: ListMutationInput,
): Promise<{ added: boolean }> {
  const result = await ListEntry.updateOne(
    {
      profileId: profile._id,
      kind: input.kind,
      mediaType: input.mediaType,
      mediaId: new Types.ObjectId(input.mediaId),
    },
    { $setOnInsert: { userId: profile.userId, createdAt: new Date() } },
    { upsert: true },
  );

  // Only a genuinely new entry is worth announcing; re-adding is a no-op.
  if (result.upsertedCount > 0 && input.kind === 'my_list') {
    const { recordActivity } = await import('./social.service');
    const title = await lookupTitle(input.mediaType, input.mediaId);
    await recordActivity(profile, 'listed', {
      mediaType: input.mediaType,
      mediaId: new Types.ObjectId(input.mediaId),
      mediaTitle: title?.title,
      mediaSlug: title?.slug,
    });
  }

  // Upsert rather than read-then-write: adding twice is idempotent, and the
  // unique index settles any race between two tabs.
  return { added: result.upsertedCount > 0 };
}

/** Title name + slug, denormalised onto activity rows so the feed needs no join. */
async function lookupTitle(mediaType: MediaType, mediaId: string) {
  return mediaType === 'movie'
    ? Movie.findById(mediaId).select('title slug').lean()
    : TVShow.findById(mediaId).select('title slug').lean();
}

export async function removeFromList(
  profile: ProfileDocument,
  input: ListMutationInput,
): Promise<{ removed: boolean }> {
  const result = await ListEntry.deleteOne({
    profileId: profile._id,
    kind: input.kind,
    mediaType: input.mediaType,
    mediaId: new Types.ObjectId(input.mediaId),
  });
  return { removed: result.deletedCount > 0 };
}

export async function getListedIds(
  profileId: Types.ObjectId,
  kind: ListKind,
  limit = 100,
): Promise<Types.ObjectId[]> {
  const rows = await ListEntry.find({ profileId, kind })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('mediaId')
    .lean();
  return rows.map((row) => row.mediaId);
}

/** Which of this profile's lists contain a given title — one query, not three. */
export async function getListMembership(
  profileId: Types.ObjectId,
  mediaId: Types.ObjectId,
): Promise<ListKind[]> {
  const rows = await ListEntry.find({ profileId, mediaId }).select('kind').lean();
  return rows.map((row) => row.kind);
}

export async function getList(
  profile: ProfileDocument,
  kind: ListKind,
): Promise<TitleSummaryDTO[]> {
  const ids = await getListedIds(profile._id, kind);
  if (ids.length === 0) return [];

  const allowed = profile.allowedRatings();
  const [movies, shows] = await Promise.all([
    Movie.find({ _id: { $in: ids }, isPublished: true, maturityRating: { $in: allowed } }).lean(),
    TVShow.find({ _id: { $in: ids }, isPublished: true, maturityRating: { $in: allowed } }).lean(),
  ]);

  const summaries = [
    ...movies.map((m) => toSummary({ ...m, mediaType: 'movie' } as never)),
    ...shows.map((s) =>
      toSummary({
        ...s,
        mediaType: 'tv',
        releaseDate: s.firstAirDate ?? null,
        runtimeMinutes: s.averageRuntimeMinutes || null,
      } as never),
    ),
  ];

  // Preserve the saved order; `$in` returns documents in storage order.
  const order = new Map(ids.map((id, index) => [id.toString(), index]));
  summaries.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return summaries;
}

export async function setReaction(
  profile: ProfileDocument,
  mediaType: MediaType,
  mediaId: string,
  reaction: 'like' | 'dislike' | 'none',
): Promise<{ reaction: 'like' | 'dislike' | 'none' }> {
  const filter = {
    profileId: profile._id,
    mediaType,
    mediaId: new Types.ObjectId(mediaId),
  };

  if (reaction === 'none') {
    await Reaction.deleteOne(filter);
    return { reaction: 'none' };
  }

  await Reaction.updateOne(
    filter,
    { $set: { reaction, userId: profile.userId } },
    { upsert: true },
  );
  return { reaction };
}

export async function getReaction(
  profileId: Types.ObjectId,
  mediaId: Types.ObjectId,
): Promise<'like' | 'dislike' | 'none'> {
  const row = await Reaction.findOne({ profileId, mediaId }).select('reaction').lean();
  return row?.reaction ?? 'none';
}
