import { Types, type PipelineStage } from 'mongoose';
import {
  PAGINATION,
  type CatalogQuery,
  type EpisodeSummaryDTO,
  type Paginated,
  type MaturityRating,
  type MediaType,
  type SeasonSummaryDTO,
  type TitleDetailDTO,
  type TitleSummaryDTO,
} from '@shared';
import { Episode } from '../models/Episode';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { Season } from '../models/Season';
import { TVShow } from '../models/TVShow';
import { ApiError } from '../utils/ApiError';
import { paginate } from '../utils/http';

/**
 * Catalog reads.
 *
 * Movies and shows live in separate collections because their fields and write
 * patterns differ, but users browse one merged catalog. `$unionWith` reconciles
 * that in the database: one pipeline, one sort, one pagination pass. Fetching
 * both collections separately and merging in Node would mean over-fetching to
 * page correctly, and a "top 20 by popularity" would have to pull far more than
 * 20 rows from each side to be certain of the answer.
 */

/** The union pipeline normalises both shapes onto these field names. */
interface UnifiedTitle {
  _id: Types.ObjectId;
  mediaType: MediaType;
  title: string;
  slug: string;
  overview: string;
  genres: string[];
  language: string;
  maturityRating: MaturityRating;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  releaseDate: Date | null;
  runtimeMinutes: number | null;
  averageScore: number;
  ratingCount: number;
  popularity: number;
  tagline: string | null;
  cast: TitleDetailDTO['cast'];
  directors: string[];
  keywords: string[];
  isFeatured: boolean;
}

const SORT_FIELDS: Record<CatalogQuery['sort'], string> = {
  popularity: 'popularity',
  rating: 'averageScore',
  releaseDate: 'releaseDate',
  title: 'title',
  runtime: 'runtimeMinutes',
  newest: 'createdAt',
};

/**
 * Builds the shared `$match` for a browse query.
 *
 * `isPublished` leads every compound index in the catalog collections, so it
 * must lead the filter for the planner to use them.
 */
function baseMatch(query: CatalogQuery, profile?: ProfileDocument | null): Record<string, unknown> {
  const match: Record<string, unknown> = { isPublished: true };

  if (query.genre?.length) match.genres = { $in: query.genre };
  if (query.language?.length) match.language = { $in: query.language };
  if (query.minScore !== undefined) match.averageScore = { $gte: query.minScore };

  /**
   * Maturity filtering is applied server-side, never trusted to the client.
   * A kids profile that could ask for R-rated titles by editing a request would
   * make the whole feature decorative.
   */
  const allowed = profile ? profile.allowedRatings() : null;
  if (allowed) {
    const requested = query.rating?.length
      ? query.rating.filter((r) => allowed.includes(r as MaturityRating))
      : allowed;
    match.maturityRating = { $in: requested };
  } else if (query.rating?.length) {
    match.maturityRating = { $in: query.rating };
  }

  return match;
}

/** Year and runtime filters apply to fields whose names differ per collection. */
function rangeMatch(query: CatalogQuery, dateField: string, runtimeField: string) {
  const match: Record<string, unknown> = {};

  if (query.yearFrom !== undefined || query.yearTo !== undefined) {
    const range: Record<string, Date> = {};
    if (query.yearFrom !== undefined) range.$gte = new Date(Date.UTC(query.yearFrom, 0, 1));
    if (query.yearTo !== undefined) range.$lte = new Date(Date.UTC(query.yearTo, 11, 31, 23, 59, 59));
    match[dateField] = range;
  }

  if (query.runtimeMin !== undefined || query.runtimeMax !== undefined) {
    const range: Record<string, number> = {};
    if (query.runtimeMin !== undefined) range.$gte = query.runtimeMin;
    if (query.runtimeMax !== undefined) range.$lte = query.runtimeMax;
    match[runtimeField] = range;
  }

  return match;
}

/** Projection that gives both collections identical field names. */
const MOVIE_PROJECTION: PipelineStage.AddFields['$addFields'] = {
  mediaType: 'movie',
};

const SHOW_PROJECTION: PipelineStage.AddFields['$addFields'] = {
  mediaType: 'tv',
  // Shows carry `firstAirDate` and a mean episode runtime; aliasing them here
  // means one sort spec works across the union.
  releaseDate: '$firstAirDate',
  runtimeMinutes: '$averageRuntimeMinutes',
};

/**
 * Runs a merged movie + show query.
 *
 * `$facet` returns the page and the total count from a single pass, so
 * pagination does not cost a second round trip.
 */
export async function browseCatalog(
  query: CatalogQuery,
  profile?: ProfileDocument | null,
): Promise<Paginated<TitleSummaryDTO>> {
  const shared = baseMatch(query, profile);
  const limit = Math.min(query.limit, PAGINATION.maxLimit);
  const skip = (query.page - 1) * limit;

  const movieMatch = { ...shared, ...rangeMatch(query, 'releaseDate', 'runtimeMinutes') };
  const showMatch = { ...shared, ...rangeMatch(query, 'firstAirDate', 'averageRuntimeMinutes') };

  if (query.q) {
    const escaped = escapeRegex(query.q);
    movieMatch.title = { $regex: escaped, $options: 'i' };
    showMatch.title = { $regex: escaped, $options: 'i' };
  }

  const sortField = SORT_FIELDS[query.sort];
  const direction = query.order === 'asc' ? 1 : -1;

  const includeMovies = query.type !== 'tv';
  const includeShows = query.type !== 'movie';

  const pipeline: PipelineStage[] = [];

  if (includeMovies) {
    pipeline.push({ $match: movieMatch }, { $addFields: MOVIE_PROJECTION });
  } else {
    // Type-filtered to TV only: start from an empty movie set and union in the
    // shows, so the whole query stays one pipeline.
    pipeline.push({ $match: { _id: { $exists: false } } });
  }

  if (includeShows) {
    pipeline.push({
      $unionWith: {
        coll: 'tvshows',
        pipeline: [{ $match: showMatch }, { $addFields: SHOW_PROJECTION }],
      },
    });
  }

  pipeline.push(
    // `_id` breaks ties so pagination is stable: without it, two titles with
    // equal popularity can swap order between pages and one is shown twice
    // while another is skipped entirely.
    { $sort: { [sortField]: direction, _id: 1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  );

  const [result] = await Movie.aggregate<{
    items: UnifiedTitle[];
    total: Array<{ count: number }>;
  }>(pipeline);

  const items = result?.items ?? [];
  const total = result?.total[0]?.count ?? 0;

  return paginate(items.map((doc) => toSummary(doc)), total, query.page, limit);
}

/** Regex metacharacters in user input must not become regex syntax. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toSummary(doc: UnifiedTitle, matchScore: number | null = null): TitleSummaryDTO {
  return {
    id: doc._id.toString(),
    mediaType: doc.mediaType,
    title: doc.title,
    slug: doc.slug,
    overview: doc.overview,
    genres: doc.genres as TitleSummaryDTO['genres'],
    language: doc.language as TitleSummaryDTO['language'],
    maturityRating: doc.maturityRating,
    posterUrl: doc.posterUrl ?? null,
    backdropUrl: doc.backdropUrl ?? null,
    releaseYear: doc.releaseDate ? new Date(doc.releaseDate).getUTCFullYear() : null,
    runtimeMinutes: doc.runtimeMinutes ?? null,
    averageScore: round1(doc.averageScore ?? 0),
    ratingCount: doc.ratingCount ?? 0,
    popularity: doc.popularity ?? 0,
    matchScore,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface ResolvedTitle {
  mediaType: MediaType;
  doc: UnifiedTitle & Record<string, unknown>;
}

/**
 * Finds a title by slug across both collections.
 *
 * Slugs are unique per collection, not globally — a film and a series could in
 * principle share one. Movies are checked first and win, which is deterministic
 * and matches how the seed assigns slugs.
 */
export async function findTitleBySlug(slug: string): Promise<ResolvedTitle | null> {
  const movie = await Movie.findOne({ slug, isPublished: true }).lean();
  if (movie) {
    return { mediaType: 'movie', doc: { ...movie, mediaType: 'movie' } as ResolvedTitle['doc'] };
  }

  const show = await TVShow.findOne({ slug, isPublished: true }).lean();
  if (show) {
    return {
      mediaType: 'tv',
      doc: {
        ...show,
        mediaType: 'tv',
        releaseDate: show.firstAirDate ?? null,
        runtimeMinutes: show.averageRuntimeMinutes || null,
      } as unknown as ResolvedTitle['doc'],
    };
  }

  return null;
}

export async function findTitleById(mediaType: MediaType, id: string): Promise<ResolvedTitle | null> {
  if (!Types.ObjectId.isValid(id)) return null;

  if (mediaType === 'movie') {
    const movie = await Movie.findOne({ _id: id, isPublished: true }).lean();
    return movie ? { mediaType: 'movie', doc: { ...movie, mediaType: 'movie' } as ResolvedTitle['doc'] } : null;
  }

  const show = await TVShow.findOne({ _id: id, isPublished: true }).lean();
  return show
    ? {
        mediaType: 'tv',
        doc: {
          ...show,
          mediaType: 'tv',
          releaseDate: show.firstAirDate ?? null,
          runtimeMinutes: show.averageRuntimeMinutes || null,
        } as unknown as ResolvedTitle['doc'],
      }
    : null;
}

export async function getSeasons(showId: Types.ObjectId): Promise<SeasonSummaryDTO[]> {
  const seasons = await Season.find({ showId }).sort({ seasonNumber: 1 }).lean();
  return seasons.map((season) => ({
    id: season._id.toString(),
    seasonNumber: season.seasonNumber,
    name: season.name,
    overview: season.overview,
    posterUrl: season.posterUrl ?? null,
    airDate: season.airDate ? season.airDate.toISOString() : null,
    episodeCount: season.episodeCount,
  }));
}

export async function getEpisodes(
  showId: Types.ObjectId,
  seasonNumber?: number,
): Promise<EpisodeSummaryDTO[]> {
  const filter: Record<string, unknown> = { showId, isPublished: true };
  if (seasonNumber !== undefined) filter.seasonNumber = seasonNumber;

  const episodes = await Episode.find(filter)
    .sort({ seasonNumber: 1, episodeNumber: 1 })
    .lean();

  return episodes.map((episode) => ({
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
    progress: null,
  }));
}

/**
 * Content-based "more like this".
 *
 * Scores candidates by overlap on genres, cast and director against the source
 * title, computed in the database so only the top N cross the wire. This is the
 * same similarity idea the recommender uses, scoped to one seed title.
 */
export async function getSimilarTitles(
  source: ResolvedTitle,
  profile: ProfileDocument | null | undefined,
  limit = 12,
): Promise<TitleSummaryDTO[]> {
  const doc = source.doc;
  const genres = (doc.genres ?? []) as string[];
  const castNames = ((doc.cast ?? []) as Array<{ name: string }>).map((c) => c.name).slice(0, 10);
  const directors = (doc.directors ?? []) as string[];

  const allowed = profile?.allowedRatings();
  const match: Record<string, unknown> = { isPublished: true };
  if (allowed) match.maturityRating = { $in: allowed };

  const scoring: PipelineStage[] = [
    { $match: match },
    {
      $addFields: {
        // Weighted overlap: shared genres are the strongest ordinary signal,
        // a shared director the strongest rare one.
        genreOverlap: { $size: { $setIntersection: ['$genres', genres] } },
        castOverlap: {
          $size: { $setIntersection: [{ $map: { input: '$cast', as: 'c', in: '$$c.name' } }, castNames] },
        },
        directorOverlap: { $size: { $setIntersection: ['$directors', directors] } },
      },
    },
    {
      $addFields: {
        similarity: {
          $add: [
            { $multiply: ['$genreOverlap', 3] },
            { $multiply: ['$castOverlap', 2] },
            { $multiply: ['$directorOverlap', 5] },
            // Popularity as a tiny tiebreaker only — enough to order otherwise
            // equal candidates without letting blockbusters dominate.
            { $multiply: [{ $ifNull: ['$popularity', 0] }, 0.01] },
          ],
        },
      },
    },
    { $match: { similarity: { $gt: 0 } } },
  ];

  const pipeline: PipelineStage[] = [
    ...scoring,
    { $addFields: MOVIE_PROJECTION },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [...scoring, { $addFields: SHOW_PROJECTION }] as PipelineStage.FacetPipelineStage[],
      },
    },
    // Exclude the source title itself from its own "similar" row.
    { $match: { _id: { $ne: doc._id } } },
    { $sort: { similarity: -1, popularity: -1, _id: 1 } },
    { $limit: limit },
  ];

  const results = await Movie.aggregate<UnifiedTitle>(pipeline);
  return results.map((item) => toSummary(item));
}

export function assertTitleVisible(
  resolved: ResolvedTitle | null,
  profile?: ProfileDocument | null,
): ResolvedTitle {
  if (!resolved) throw ApiError.notFound('That title is not in the catalog', 'TITLE_NOT_FOUND');

  const allowed = profile?.allowedRatings();
  if (allowed && !allowed.includes(resolved.doc.maturityRating)) {
    // 404 rather than 403: a kids profile should not learn the title exists.
    throw ApiError.notFound('That title is not in the catalog', 'TITLE_NOT_FOUND');
  }

  return resolved;
}
