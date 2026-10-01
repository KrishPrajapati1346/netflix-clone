import { Router } from 'express';
import { catalogQuerySchema } from '@shared';
import * as controller from '../controllers/catalog.controller';
import { optionalAuth, optionalProfile, requireAuth, requireProfile } from '../middleware/auth';
import { searchLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Catalog reads.
 *
 * Most routes use `optionalAuth` + `optionalProfile`: anonymous visitors get
 * the public catalog, and a signed-in profile gets the same data filtered by
 * its maturity limit and annotated with its own progress. One code path, two
 * audiences — rather than a separate public API.
 */
router.get('/filters', controller.filterOptions);

router.get(
  '/browse',
  optionalAuth,
  optionalProfile,
  searchLimiter,
  validate({ query: catalogQuerySchema }),
  controller.browse,
);

// The home feed is inherently personal, so it demands a real profile.
router.get('/home', requireAuth, requireProfile, controller.home);

// Registered before `/titles/:slug` so "by-id" is not captured as a slug.
router.get('/titles/by-id/:mediaType/:id', optionalAuth, optionalProfile, controller.titleById);
router.get('/titles/:slug', optionalAuth, optionalProfile, controller.titleBySlug);
router.get('/titles/:slug/similar', optionalAuth, optionalProfile, controller.similar);

router.get('/shows/:showId/episodes', optionalAuth, optionalProfile, controller.showEpisodes);
router.get('/episodes/:episodeId', optionalAuth, optionalProfile, controller.episodeDetail);

export const catalogRoutes = router;
