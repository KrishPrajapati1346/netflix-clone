import { Types, type PipelineStage } from 'mongoose';
import { GENRES, type TitleSummaryDTO } from '@shared';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { Rating, Reaction } from '../models/Rating';
import { WatchProgress } from '../models/WatchProgress';
import { toSummary } from './catalog.service';

/**
 * Recommendations, computed from signals already in the database.
 *
 * Three strategies, blended, with no hardcoded title lists anywhere:
 *
 *  1. **Content-based** — build a taste vector for the profile from what it has
 *     watched, rated and reacted to, then rank the catalog by cosine similarity
 *     against it.
 *  2. **Collaborative-lite** — "profiles that rated this highly also rated that
 *     highly", as a single aggregation over the ratings collection.
 *  3. **Popularity** — the cold-start fallback, and the top-up when the first
 *     two cannot fill a row.
 *
 * Deliberately no ML infrastructure. Cosine similarity over a genre vector is a
 * few lines of aggregation, runs inside the free tier, and is honest about what
 * it is. The interesting engineering here is the feature weighting and the
 * cold-start handling, not the maths.
 */

/** The feature space: one dimension per genre. */
const GENRE_INDEX = new Map(GENRES.map((genre, index) => [genre as string, index]));

/**
 * How strongly each interaction expresses taste.
 *
 * An explicit 5-star rating says far more than "started playing". A dislike is
 * negative evidence and pushes the vector away from that genre — without it,
 * watching one disliked horror film would keep recommending horror forever.
 */
const SIGNAL_WEIGHTS = {
  completed: 3,
  started: 1,
  ratingHigh: 5,
  ratingLow: -3,
  like: 4,
  dislike: -5,
} as const;

export interface TasteVector {
  /** Weight per genre index; not normalised until comparison time. */
  weights: number[];
  /** Titles already seen, excluded from recommendations. */
  seenIds: Set<string>;
  /** How much evidence went into this vector — drives the cold-start decision. */
  signalCount: number;
}

/**
 * Builds a profile's taste vector from its watch, rating and reaction history.
 *
 * Bounded to the most recent interactions: taste drifts, and a profile with
 * thousands of rows should not pay for all of them on every home page load.
 */
export async function buildTasteVector(profile: ProfileDocument): Promise<TasteVector> {
  const [progress, ratings, reactions] = await Promise.all([
    WatchProgress.find({ profileId: profile._id }).sort({ lastWatchedAt: -1 }).limit(120).lean(),
    Rating.find({ profileId: profile._id }).sort({ updatedAt: -1 }).limit(120).lean(),
    Reaction.find({ profileId: profile._id }).sort({ updatedAt: -1 }).limit(120).lean(),
  ]);

  const contributions = new Map<string, number>();
  const seenIds = new Set<string>();

  for (const row of progress) {
    const id = row.mediaId.toString();
    seenIds.add(id);
    addWeight(contributions, id, row.completed ? SIGNAL_WEIGHTS.completed : SIGNAL_WEIGHTS.started);
  }

  for (const row of ratings) {
    const id = row.mediaId.toString();
    seenIds.add(id);
    // 3.5 stars is the neutral point: above is endorsement, below is a warning.
    addWeight(contributions, id, row.score >= 3.5 ? SIGNAL_WEIGHTS.ratingHigh : SIGNAL_WEIGHTS.ratingLow);
  }

  for (const row of reactions) {
    const id = row.mediaId.toString();
    seenIds.add(id);
    addWeight(contributions, id, row.reaction === 'like' ? SIGNAL_WEIGHTS.like : SIGNAL_WEIGHTS.dislike);
  }

  const weights = new Array<number>(GENRES.length).fill(0);
  const signalCount = contributions.size;

  if (signalCount === 0) return { weights, seenIds, signalCount };

  // Resolve the genres of everything the profile interacted with, in two bulk
  // queries rather than one per title.
  const ids = [...contributions.keys()].map((id) => new Types.ObjectId(id));
  const genreRows = await Movie.aggregate<{ _id: Types.ObjectId; genres: string[] }>([
    { $match: { _id: { $in: ids } } },
    { $project: { genres: 1 } },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [{ $match: { _id: { $in: ids } } }, { $project: { genres: 1 } }],
      },
    },
  ]);

  for (const row of genreRows) {
    const weight = contributions.get(row._id.toString()) ?? 0;
    if (weight === 0) continue;

    // Spread each title's weight across its genres so a title tagged with five
    // genres does not count five times as much as a single-genre one.
    const share = weight / Math.max(1, row.genres.length);
    for (const genre of row.genres) {
      const index = GENRE_INDEX.get(genre);
      if (index !== undefined) weights[index] = (weights[index] ?? 0) + share;
    }
  }

  return { weights, seenIds, signalCount };
}

function addWeight(map: Map<string, number>, id: string, weight: number): void {
  map.set(id, (map.get(id) ?? 0) + weight);
}

/**
 * Ranks the catalog by cosine similarity against a taste vector.
 *
 * Cosine rather than dot product because it compares *direction* and ignores
 * magnitude: without normalisation, a title tagged with many genres would score
 * higher simply for having more non-zero dimensions.
 */
export async function contentBasedRecommendations(
  profile: ProfileDocument,
  taste: TasteVector,
  limit = 20,
): Promise<TitleSummaryDTO[]> {
  const positive = taste.weights.map((w) => Math.max(0, w));
  const magnitude = Math.sqrt(positive.reduce((sum, w) => sum + w * w, 0));
  if (magnitude === 0) return [];

  // Genres the profile actively dislikes, demoted rather than hard-filtered:
  // one bad experience should not permanently erase a whole genre.
  const disliked = new Set(
    taste.weights
      .map((weight, index) => ({ weight, genre: GENRES[index] }))
      .filter((entry) => entry.weight < 0)
      .map((entry) => entry.genre as string),
  );

  const allowed = profile.allowedRatings();
  const excluded = [...taste.seenIds].map((id) => new Types.ObjectId(id));

  const scoreStage: PipelineStage[] = [
    {
      $match: {
        isPublished: true,
        maturityRating: { $in: allowed },
        _id: { $nin: excluded },
      },
    },
    {
      $addFields: {
        // Dot product of the taste vector with this title's binary genre vector.
        tasteScore: {
          $sum: (GENRES as readonly string[]).map((genre, index) => ({
            $cond: [{ $in: [genre, '$genres'] }, positive[index] ?? 0, 0],
          })),
        },
        titleMagnitude: { $sqrt: { $max: [{ $size: '$genres' }, 1] } },
        dislikeHits: { $size: { $setIntersection: ['$genres', [...disliked]] } },
      },
    },
    {
      $addFields: {
        similarity: {
          $subtract: [
            { $divide: ['$tasteScore', { $multiply: [magnitude, '$titleMagnitude'] }] },
            // Each disliked genre costs a fixed penalty.
            { $multiply: ['$dislikeHits', 0.15] },
          ],
        },
      },
    },
    { $match: { similarity: { $gt: 0 } } },
  ];

  const pipeline: PipelineStage[] = [
    ...scoreStage,
    { $addFields: { mediaType: 'movie' } },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [
          ...scoreStage,
          {
            $addFields: {
              mediaType: 'tv',
              releaseDate: '$firstAirDate',
              runtimeMinutes: '$averageRuntimeMinutes',
            },
          },
        ] as PipelineStage.FacetPipelineStage[],
      },
    },
    { $sort: { similarity: -1, popularity: -1, _id: 1 } },
    { $limit: limit },
  ];

  const rows = await Movie.aggregate(pipeline);
  return rows.map((row) => toSummary(row, toMatchScore(row.similarity as number)));
}

/**
 * Collaborative filtering, "lite".
 *
 * Finds profiles that rated the same titles highly as this one, then surfaces
 * what *they* rated highly that this profile has not seen. Entirely an
 * aggregation over the ratings collection — no model, no training step.
 *
 * Returns nothing when there is not enough overlap, rather than guessing; the
 * caller falls back to the content-based and popularity rows.
 */
export async function collaborativeRecommendations(
  profile: ProfileDocument,
  taste: TasteVector,
  limit = 20,
): Promise<TitleSummaryDTO[]> {
  const liked = await Rating.find({ profileId: profile._id, score: { $gte: 4 } })
    .select('mediaId')
    .limit(50)
    .lean();

  if (liked.length === 0) return [];

  const likedIds = liked.map((row) => row.mediaId);
  const allowed = profile.allowedRatings();
  const excluded = [...taste.seenIds].map((id) => new Types.ObjectId(id));

  const rows = await Rating.aggregate<{ _id: Types.ObjectId; score: number; raters: number }>([
    // Everyone else who rated something this profile also rated highly.
    { $match: { mediaId: { $in: likedIds }, score: { $gte: 4 }, profileId: { $ne: profile._id } } },
    { $group: { _id: '$profileId', overlap: { $sum: 1 } } },
    // Require more than a single shared title, or one coincidence becomes a
    // recommendation.
    { $match: { overlap: { $gte: 2 } } },
    { $sort: { overlap: -1 } },
    { $limit: 200 },

    // What else did those neighbours rate highly?
    {
      $lookup: {
        from: 'ratings',
        let: { neighbour: '$_id', overlap: '$overlap' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$profileId', '$$neighbour'] }, { $gte: ['$score', 4] }] },
            },
          },
          { $project: { mediaId: 1, score: 1, weight: '$$overlap' } },
        ],
        as: 'theirRatings',
      },
    },
    { $unwind: '$theirRatings' },
    { $match: { 'theirRatings.mediaId': { $nin: [...likedIds, ...excluded] } } },

    // Score each candidate by how much its endorsers overlap with this profile.
    {
      $group: {
        _id: '$theirRatings.mediaId',
        score: { $sum: { $multiply: ['$theirRatings.score', '$overlap'] } },
        raters: { $sum: 1 },
      },
    },
    { $match: { raters: { $gte: 2 } } },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row._id);
  const titles = await Movie.aggregate([
    { $match: { _id: { $in: ids }, isPublished: true, maturityRating: { $in: allowed } } },
    { $addFields: { mediaType: 'movie' } },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [
          { $match: { _id: { $in: ids }, isPublished: true, maturityRating: { $in: allowed } } },
          {
            $addFields: {
              mediaType: 'tv',
              releaseDate: '$firstAirDate',
              runtimeMinutes: '$averageRuntimeMinutes',
            },
          },
        ] as PipelineStage.FacetPipelineStage[],
      },
    },
  ]);

  // Restore the ranking the aggregation produced; `$in` does not preserve order.
  const rank = new Map(rows.map((row, index) => [row._id.toString(), index]));
  titles.sort((a, b) => (rank.get(a._id.toString()) ?? 0) - (rank.get(b._id.toString()) ?? 0));

  const best = rows[0]?.score ?? 1;
  return titles.map((title) => {
    const raw = rows.find((r) => r._id.toString() === title._id.toString())?.score ?? 0;
    return toSummary(title, toMatchScore(raw / best));
  });
}

/** Cold-start and top-up: what is popular and well rated right now. */
export async function popularTitles(
  profile: ProfileDocument | null | undefined,
  limit = 20,
  excludeIds: Set<string> = new Set(),
): Promise<TitleSummaryDTO[]> {
  const allowed = profile?.allowedRatings();
  const match: Record<string, unknown> = { isPublished: true };
  if (allowed) match.maturityRating = { $in: allowed };
  if (excludeIds.size > 0) {
    match._id = { $nin: [...excludeIds].map((id) => new Types.ObjectId(id)) };
  }

  const rows = await Movie.aggregate([
    { $match: match },
    { $addFields: { mediaType: 'movie' } },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [
          { $match: match },
          {
            $addFields: {
              mediaType: 'tv',
              releaseDate: '$firstAirDate',
              runtimeMinutes: '$averageRuntimeMinutes',
            },
          },
        ] as PipelineStage.FacetPipelineStage[],
      },
    },
    { $sort: { popularity: -1, averageScore: -1, _id: 1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => toSummary(row));
}

/**
 * Converts a 0–1 similarity into the familiar "97% match" badge.
 *
 * Floored at 55 because a badge reading "12% match" is worse than no badge —
 * it advertises that the recommendation is bad rather than simply ranking it
 * lower, which the ordering already does.
 */
function toMatchScore(similarity: number): number {
  const clamped = Math.max(0, Math.min(1, similarity));
  return Math.round(55 + clamped * 44);
}

/** True when there is too little history for personalisation to mean anything. */
export function isColdStart(taste: TasteVector): boolean {
  return taste.signalCount < 3;
}
