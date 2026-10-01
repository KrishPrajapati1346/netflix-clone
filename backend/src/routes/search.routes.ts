import { Router } from 'express';
import { autocompleteQuerySchema, searchQuerySchema } from '@shared';
import { optionalAuth, optionalProfile, requireAuth, requireProfile } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimit';
import { query, validate } from '../middleware/validate';
import * as search from '../services/search.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, sendData } from '../utils/http';
import type { AutocompleteQuery, SearchQuery } from '@shared';

const router = Router();

/**
 * Search is public: anonymous visitors can find titles, and a signed-in profile
 * additionally gets maturity filtering and its own history.
 */
router.get(
  '/',
  optionalAuth,
  optionalProfile,
  searchLimiter,
  validate({ query: searchQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await search.searchTitles(query<SearchQuery>(req), req.profile);
    sendData(res, result);
  }),
);

router.get(
  '/autocomplete',
  optionalAuth,
  optionalProfile,
  searchLimiter,
  validate({ query: autocompleteQuerySchema }),
  asyncHandler(async (req, res) => {
    const suggestions = await search.autocomplete(query<AutocompleteQuery>(req), req.profile);
    sendData(res, { suggestions });
  }),
);

/** Trending is global and cheap, so it needs no session. */
router.get(
  '/trending',
  asyncHandler(async (_req, res) => {
    sendData(res, { terms: await search.getTrendingSearches() });
  }),
);

// History belongs to one profile, so it requires an unlocked one.
router.get(
  '/history',
  requireAuth,
  requireProfile,
  asyncHandler(async (req, res) => {
    if (!req.profile) throw ApiError.badRequest('Choose a profile', 'PROFILE_REQUIRED');
    sendData(res, { terms: await search.getSearchHistory(req.profile._id) });
  }),
);

router.delete(
  '/history',
  requireAuth,
  requireProfile,
  asyncHandler(async (req, res) => {
    if (!req.profile) throw ApiError.badRequest('Choose a profile', 'PROFILE_REQUIRED');
    sendData(res, { cleared: await search.clearSearchHistory(req.profile._id) });
  }),
);

export const searchRoutes = router;
