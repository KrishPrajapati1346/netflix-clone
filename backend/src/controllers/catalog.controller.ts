import { GENRES, LANGUAGES, MATURITY_RATINGS, type CatalogQuery } from '@shared';
import { Episode } from '../models/Episode';
import * as catalog from '../services/catalog.service';
import { buildHomeFeed } from '../services/feed.service';
import { buildTitleDetail } from '../services/title-detail.service';
import {
  getEpisodeProgressMap,
  getProgressFor,
  toEpisodeSummary,
} from '../services/progress.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, param, sendData } from '../utils/http';
import { query as validatedQuery } from '../middleware/validate';

export const browse = asyncHandler(async (req, res) => {
  const input = validatedQuery<CatalogQuery>(req);
  const page = await catalog.browseCatalog(input, req.profile);
  sendData(res, page);
});

/** The personalised home page. Requires a profile — rows are profile-scoped. */
export const home = asyncHandler(async (req, res) => {
  if (!req.profile) throw ApiError.badRequest('Choose a profile to continue', 'PROFILE_REQUIRED');
  const feed = await buildHomeFeed(req.profile);
  sendData(res, feed);
});

export const titleBySlug = asyncHandler(async (req, res) => {
  const slug = param(req, 'slug');
  if (!slug) throw ApiError.badRequest('Missing title slug');

  const resolved = catalog.assertTitleVisible(await catalog.findTitleBySlug(slug), req.profile);
  const detail = await buildTitleDetail(resolved, req.profile);
  sendData(res, detail);
});

/**
 * Detail lookup by id rather than slug.
 *
 * The player is reached by id (rows and heroes carry ids, not slugs), so
 * without this the client would have to search the catalog to find the slug
 * that addresses the same document it already identified.
 */
export const titleById = asyncHandler(async (req, res) => {
  const mediaType = param(req, 'mediaType') === 'tv' ? 'tv' : 'movie';
  const id = param(req, 'id');

  const resolved = catalog.assertTitleVisible(
    await catalog.findTitleById(mediaType, id),
    req.profile,
  );
  sendData(res, await buildTitleDetail(resolved, req.profile));
});

export const similar = asyncHandler(async (req, res) => {
  const slug = param(req, 'slug');
  if (!slug) throw ApiError.badRequest('Missing title slug');

  const resolved = catalog.assertTitleVisible(await catalog.findTitleBySlug(slug), req.profile);
  const items = await catalog.getSimilarTitles(resolved, req.profile);
  sendData(res, { items });
});

export const showEpisodes = asyncHandler(async (req, res) => {
  const showId = param(req, 'showId');
  if (!showId) throw ApiError.badRequest('Missing show id');

  const resolved = catalog.assertTitleVisible(await catalog.findTitleById('tv', showId), req.profile);

  const seasonParam = req.query.season;
  const seasonNumber = typeof seasonParam === 'string' ? Number(seasonParam) : undefined;

  const episodes = await catalog.getEpisodes(
    resolved.doc._id,
    Number.isFinite(seasonNumber) ? seasonNumber : undefined,
  );

  // Attach this profile's progress so the episode list can show resume bars
  // without the client issuing a request per episode. One bulk lookup, then a
  // map join — not a query per episode.
  if (req.profile) {
    const progressByEpisode = await getEpisodeProgressMap(req.profile._id, resolved.doc._id);
    sendData(res, {
      items: episodes.map((episode) => ({
        ...episode,
        progress: progressByEpisode.get(episode.id) ?? null,
      })),
    });
    return;
  }

  sendData(res, { items: episodes });
});

/** Everything the player needs for one episode, including its sources. */
export const episodeDetail = asyncHandler(async (req, res) => {
  const episodeId = param(req, 'episodeId');
  if (!episodeId) throw ApiError.badRequest('Missing episode id');

  const episode = await Episode.findOne({ _id: episodeId, isPublished: true }).lean();
  if (!episode) throw ApiError.notFound('Episode not found', 'EPISODE_NOT_FOUND');

  // The episode inherits its show's rating, so visibility is checked there.
  const show = catalog.assertTitleVisible(
    await catalog.findTitleById('tv', episode.showId.toString()),
    req.profile,
  );

  const progress = req.profile
    ? await getProgressFor(req.profile._id, 'tv', episode.showId, episode._id)
    : null;

  sendData(res, {
    ...toEpisodeSummary(episode, progress),
    sources: episode.sources,
    subtitles: episode.subtitles,
    chapters: episode.chapters,
    showTitle: show.doc.title,
    showSlug: show.doc.slug,
  });
});

/** Filter vocabulary for the browse UI, so the client never hardcodes it. */
export const filterOptions = asyncHandler(async (_req, res) => {
  sendData(res, {
    genres: GENRES,
    languages: LANGUAGES,
    ratings: MATURITY_RATINGS,
    sorts: ['popularity', 'rating', 'releaseDate', 'title', 'runtime', 'newest'],
  });
});
