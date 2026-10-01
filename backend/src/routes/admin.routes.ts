import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  createEpisodeSchema,
  createMovieSchema,
  createSeasonSchema,
  createShowSchema,
  updateEpisodeSchema,
  updateMovieSchema,
  updateSeasonSchema,
  updateShowSchema,
  USER_ROLES,
} from '@shared';
import type {
  CreateEpisodeInput,
  CreateMovieInput,
  CreateSeasonInput,
  CreateShowInput,
  UpdateEpisodeInput,
  UpdateMovieInput,
  UpdateSeasonInput,
  UpdateShowInput,
} from '@shared';
import * as controller from '../controllers/admin.controller';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { body, validate } from '../middleware/validate';
import * as admin from '../services/admin.service';
import { getAnalytics } from '../services/analytics.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, param, sendData } from '../utils/http';

const router = Router();

/**
 * Every admin route sits behind both gates, applied at the router level rather
 * than per-route. A route added to this file later cannot forget them.
 */
router.use(requireAuth, requireAdmin);

function actingUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

router.get('/overview', controller.overview);

/* --------------------------------------------------------------- analytics */

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    sendData(res, await getAnalytics(days));
  }),
);

/* ----------------------------------------------------------------- catalog */

router.get(
  '/catalog',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    sendData(res, await admin.listCatalog(page, limit, search));
  }),
);

router.post(
  '/movies',
  writeLimiter,
  validate({ body: createMovieSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { movie: await admin.createMovie(body<CreateMovieInput>(req)) }, 201);
  }),
);

router.patch(
  '/movies/:id',
  writeLimiter,
  validate({ body: updateMovieSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { movie: await admin.updateMovie(param(req, 'id'), body<UpdateMovieInput>(req)) });
  }),
);

router.delete(
  '/movies/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    await admin.deleteMovie(param(req, 'id'));
    sendData(res, { deleted: true });
  }),
);

router.post(
  '/shows',
  writeLimiter,
  validate({ body: createShowSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { show: await admin.createShow(body<CreateShowInput>(req)) }, 201);
  }),
);

router.patch(
  '/shows/:id',
  writeLimiter,
  validate({ body: updateShowSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { show: await admin.updateShow(param(req, 'id'), body<UpdateShowInput>(req)) });
  }),
);

router.delete(
  '/shows/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    await admin.deleteShow(param(req, 'id'));
    sendData(res, { deleted: true });
  }),
);

router.post(
  '/seasons',
  writeLimiter,
  validate({ body: createSeasonSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { season: await admin.createSeason(body<CreateSeasonInput>(req)) }, 201);
  }),
);

router.patch(
  '/seasons/:id',
  writeLimiter,
  validate({ body: updateSeasonSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { season: await admin.updateSeason(param(req, 'id'), body<UpdateSeasonInput>(req)) });
  }),
);

router.delete(
  '/seasons/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    await admin.deleteSeason(param(req, 'id'));
    sendData(res, { deleted: true });
  }),
);

router.post(
  '/episodes',
  writeLimiter,
  validate({ body: createEpisodeSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { episode: await admin.createEpisode(body<CreateEpisodeInput>(req)) }, 201);
  }),
);

router.patch(
  '/episodes/:id',
  writeLimiter,
  validate({ body: updateEpisodeSchema }),
  asyncHandler(async (req, res) => {
    sendData(res, { episode: await admin.updateEpisode(param(req, 'id'), body<UpdateEpisodeInput>(req)) });
  }),
);

router.delete(
  '/episodes/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    await admin.deleteEpisode(param(req, 'id'));
    sendData(res, { deleted: true });
  }),
);

/* -------------------------------------------------------------------- users */

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    sendData(res, await admin.listUsers(page, limit, search));
  }),
);

const roleSchema = z.object({ role: z.enum(USER_ROLES) });

router.put(
  '/users/:id/role',
  writeLimiter,
  validate({ body: roleSchema }),
  asyncHandler(async (req, res) => {
    await admin.setUserRole(
      actingUser(req)._id,
      param(req, 'id'),
      body<z.infer<typeof roleSchema>>(req).role,
    );
    sendData(res, { updated: true });
  }),
);

/* --------------------------------------------------------------- moderation */

router.get(
  '/moderation/reviews',
  asyncHandler(async (_req, res) => {
    sendData(res, { items: await admin.listModerationQueue() });
  }),
);

const hiddenSchema = z.object({ isHidden: z.boolean() });

router.put(
  '/moderation/reviews/:id',
  writeLimiter,
  validate({ body: hiddenSchema }),
  asyncHandler(async (req, res) => {
    await admin.setReviewHidden(param(req, 'id'), body<z.infer<typeof hiddenSchema>>(req).isHidden);
    sendData(res, { updated: true });
  }),
);

export const adminRoutes = router;
