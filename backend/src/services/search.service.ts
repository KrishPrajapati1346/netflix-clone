import { type Types, type PipelineStage } from 'mongoose';
import type {
  AutocompleteQuery,
  Paginated,
  SearchQuery as SearchQueryInput,
  TitleSummaryDTO,
} from '@shared';
import { features } from '../config/env';
import { logger } from '../config/logger';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { SearchQuery } from '../models/SearchQuery';
import { toSummary } from './catalog.service';
import { paginate } from '../utils/http';

/**
 * Search, with two interchangeable engines.
 *
 * **Atlas Search** (`ATLAS_SEARCH_ENABLED=true`) gives fuzzy matching,
 * autocomplete and relevance scoring through the `$search` stage. It is the
 * intended production engine and what the README documents setting up.
 *
 * **Local fallback** runs on any MongoDB, including the community server a
 * reviewer gets from `brew install mongodb-community`. It uses the `$text`
 * index defined in `media-common.ts`, plus a prefix regex for autocomplete, and
 * a small edit-distance pass so single-character typos still find something.
 *
 * Both paths return the identical shape, so nothing above this module knows or
 * cares which ran. Shipping only the Atlas path would mean search is simply
 * broken on a fresh clone — the exact thing the offline-first constraint rules
 * out.
 */

const ATLAS_INDEX = 'titles_search';

export interface SearchOutcome extends Paginated<TitleSummaryDTO> {
  /** Which engine answered, surfaced in the UI as a quiet capability note. */
  engine: 'atlas' | 'local';
  /** True when exact matching found nothing and fuzzy matching was used. */
  didYouMean: boolean;
}

export async function searchTitles(
  input: SearchQueryInput,
  profile?: ProfileDocument | null,
): Promise<SearchOutcome> {
  const term = input.q.trim();
  const allowed = profile?.allowedRatings();

  const result = features.atlasSearch
    ? await atlasSearch(term, input, allowed)
    : await localSearch(term, input, allowed);

  // Logged after the fact and never awaited into the response path — search
  // latency is the feature here, and history is a nice-to-have.
  void SearchQuery.create({
    profileId: profile?._id ?? null,
    term: term.toLowerCase(),
    resultCount: result.total,
  }).catch((error: unknown) => logger.debug({ err: error }, 'Failed to log search term'));

  return result;
}

/** Shared visibility + facet filters, applied by both engines. */
function buildFilters(
  input: SearchQueryInput,
  allowed?: string[] | null,
): Record<string, unknown> {
  const filter: Record<string, unknown> = { isPublished: true };

  if (allowed) filter.maturityRating = { $in: allowed };
  else if (input.rating?.length) filter.maturityRating = { $in: input.rating };

  if (input.genre?.length) filter.genres = { $in: input.genre };
  if (input.language?.length) filter.language = { $in: input.language };
  if (input.minScore !== undefined) filter.averageScore = { $gte: input.minScore };

  return filter;
}

/* ------------------------------------------------------------------ Atlas */

async function atlasSearch(
  term: string,
  input: SearchQueryInput,
  allowed?: string[] | null,
): Promise<SearchOutcome> {
  const filter = buildFilters(input, allowed);
  const skip = (input.page - 1) * input.limit;

  /**
   * `compound.should` lets several strategies contribute to one score:
   * an exact phrase ranks above a fuzzy token match, which ranks above a
   * keyword hit. `fuzzy.maxEdits: 1` covers ordinary typos without matching
   * unrelated words.
   */
  const searchStage: PipelineStage[] = [
    {
      $search: {
        index: ATLAS_INDEX,
        compound: {
          should: [
            { phrase: { query: term, path: 'title', score: { boost: { value: 10 } } } },
            {
              text: {
                query: term,
                path: 'title',
                fuzzy: { maxEdits: 1, prefixLength: 1 },
                score: { boost: { value: 5 } },
              },
            },
            { text: { query: term, path: ['overview', 'keywords', 'directors'] } },
            { text: { query: term, path: 'cast.name', score: { boost: { value: 3 } } } },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    { $addFields: { relevance: { $meta: 'searchScore' } } },
    { $match: filter },
  ];

  const pipeline: PipelineStage[] = [
    ...searchStage,
    { $addFields: { mediaType: 'movie' } },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [
          ...searchStage,
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
    { $sort: { relevance: -1, popularity: -1, _id: 1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: input.limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await Movie.aggregate(pipeline);
  const items = (result?.items ?? []) as Array<Record<string, unknown>>;
  const total = (result?.total?.[0]?.count as number | undefined) ?? 0;

  return {
    ...paginate(items.map((doc) => toSummary(doc as never)), total, input.page, input.limit),
    engine: 'atlas',
    didYouMean: false,
  };
}

/* ------------------------------------------------------------------ local */

async function localSearch(
  term: string,
  input: SearchQueryInput,
  allowed?: string[] | null,
): Promise<SearchOutcome> {
  const filter = buildFilters(input, allowed);

  // Pass 1: the text index. Ranked by MongoDB's own textScore, with the field
  // weights declared on the index (title 10, keywords 4, directors 2).
  const exact = await runLocalPipeline(
    { ...filter, $text: { $search: term } },
    input,
    { textScore: { $meta: 'textScore' } },
  );

  if (exact.total > 0) {
    return { ...exact, engine: 'local', didYouMean: false };
  }

  /**
   * Pass 2: substring match, which catches partial words the text index misses
   * (`$text` matches whole stemmed tokens, so "metrop" finds nothing).
   */
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partial = await runLocalPipeline(
    { ...filter, title: { $regex: escaped, $options: 'i' } },
    input,
    null,
  );

  if (partial.total > 0) {
    return { ...partial, engine: 'local', didYouMean: false };
  }

  /**
   * Pass 3: typo tolerance.
   *
   * Without Atlas there is no fuzzy operator, so candidate titles are pulled by
   * first letter and ranked by Levenshtein distance in Node. Bounded by the
   * first-letter filter, this stays cheap on a catalog of this size and is
   * honest about being a fallback — the README says fuzzy search wants Atlas.
   */
  const firstLetter = term[0] ?? '';
  const candidates = await runLocalPipeline(
    { ...filter, title: { $regex: `^${firstLetter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } },
    { ...input, page: 1, limit: 60 },
    null,
  );

  const threshold = Math.max(2, Math.floor(term.length / 3));
  const scored = candidates.items
    .map((item) => ({ item, distance: editDistance(term.toLowerCase(), item.title.toLowerCase()) }))
    .filter((entry) => entry.distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .map((entry) => entry.item);

  const start = (input.page - 1) * input.limit;
  return {
    ...paginate(scored.slice(start, start + input.limit), scored.length, input.page, input.limit),
    engine: 'local',
    didYouMean: scored.length > 0,
  };
}

async function runLocalPipeline(
  match: Record<string, unknown>,
  input: SearchQueryInput,
  projection: Record<string, unknown> | null,
): Promise<Paginated<TitleSummaryDTO>> {
  const skip = (input.page - 1) * input.limit;

  const stages: PipelineStage[] = [{ $match: match }];
  if (projection) stages.push({ $addFields: projection });

  const pipeline: PipelineStage[] = [
    ...stages,
    { $addFields: { mediaType: 'movie' } },
    {
      $unionWith: {
        coll: 'tvshows',
        pipeline: [
          ...stages,
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
    { $sort: projection ? { textScore: -1, popularity: -1, _id: 1 } : { popularity: -1, _id: 1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: input.limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await Movie.aggregate(pipeline);
  const items = (result?.items ?? []) as Array<Record<string, unknown>>;
  const total = (result?.total?.[0]?.count as number | undefined) ?? 0;

  return paginate(items.map((doc) => toSummary(doc as never)), total, input.page, input.limit);
}

/**
 * Levenshtein distance, single-row implementation.
 *
 * Only the previous row is needed to compute the next, so this is O(n) memory
 * instead of the O(n*m) a full matrix would take.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

/* --------------------------------------------------------- autocomplete */

export interface Suggestion {
  title: string;
  slug: string;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  releaseYear: number | null;
}

export async function autocomplete(
  input: AutocompleteQuery,
  profile?: ProfileDocument | null,
): Promise<Suggestion[]> {
  const allowed = profile?.allowedRatings();
  const match: Record<string, unknown> = { isPublished: true };
  if (allowed) match.maturityRating = { $in: allowed };

  const escaped = input.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (features.atlasSearch) {
    const stage: PipelineStage[] = [
      {
        $search: {
          index: ATLAS_INDEX,
          autocomplete: { query: input.q, path: 'title', fuzzy: { maxEdits: 1 } },
        },
      },
      { $match: match },
      { $limit: input.limit },
    ];

    const rows = await Movie.aggregate([
      ...stage,
      { $addFields: { mediaType: 'movie' } },
      {
        $unionWith: {
          coll: 'tvshows',
          pipeline: [...stage, { $addFields: { mediaType: 'tv', releaseDate: '$firstAirDate' } }] as never,
        },
      },
      { $limit: input.limit },
    ]);
    return rows.map(toSuggestion);
  }

  /**
   * Local autocomplete: prefix matches first, then any substring.
   *
   * Prefix is what a user typing expects to see at the top — "met" should
   * suggest "Metropolis" before "Battleship Potemkin" merely because the
   * latter contains the letters somewhere.
   */
  const prefixMatch = { ...match, title: { $regex: `^${escaped}`, $options: 'i' } };
  const anyMatch = { ...match, title: { $regex: escaped, $options: 'i' } };

  const collect = async (filter: Record<string, unknown>) =>
    Movie.aggregate([
      { $match: filter },
      { $addFields: { mediaType: 'movie' } },
      {
        $unionWith: {
          coll: 'tvshows',
          pipeline: [
            { $match: filter },
            { $addFields: { mediaType: 'tv', releaseDate: '$firstAirDate' } },
          ] as never,
        },
      },
      { $sort: { popularity: -1 } },
      { $limit: input.limit },
    ]);

  const prefix = await collect(prefixMatch);
  if (prefix.length >= input.limit) return prefix.slice(0, input.limit).map(toSuggestion);

  const rest = await collect(anyMatch);
  const seen = new Set(prefix.map((row) => String(row._id)));
  const merged = [...prefix, ...rest.filter((row) => !seen.has(String(row._id)))];

  return merged.slice(0, input.limit).map(toSuggestion);
}

function toSuggestion(row: Record<string, unknown>): Suggestion {
  const releaseDate = row.releaseDate as Date | null | undefined;
  return {
    title: row.title as string,
    slug: row.slug as string,
    mediaType: row.mediaType as 'movie' | 'tv',
    posterUrl: (row.posterUrl as string | null) ?? null,
    releaseYear: releaseDate ? new Date(releaseDate).getUTCFullYear() : null,
  };
}

/* ------------------------------------------------------- history/trending */

export async function getSearchHistory(profileId: Types.ObjectId, limit = 8): Promise<string[]> {
  const rows = await SearchQuery.aggregate<{ _id: string; lastAt: Date }>([
    { $match: { profileId, resultCount: { $gt: 0 } } },
    { $group: { _id: '$term', lastAt: { $max: '$createdAt' } } },
    { $sort: { lastAt: -1 } },
    { $limit: limit },
  ]);
  return rows.map((row) => row._id);
}

export async function clearSearchHistory(profileId: Types.ObjectId): Promise<number> {
  const result = await SearchQuery.deleteMany({ profileId });
  return result.deletedCount;
}

/** Most-searched terms in the last week, across all profiles. */
export async function getTrendingSearches(limit = 8): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await SearchQuery.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: since }, resultCount: { $gt: 0 } } },
    { $group: { _id: '$term', count: { $sum: 1 } } },
    // A term one person searched twice is not trending.
    { $match: { count: { $gte: 2 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => row._id);
}
