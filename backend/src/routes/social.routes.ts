import { Router, type Request } from 'express';
import { z } from 'zod';
import { optionalAuth, optionalProfile, requireAuth, requireProfile } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { body, validate } from '../middleware/validate';
import * as social from '../services/social.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, param, sendData } from '../utils/http';

const router = Router();

function currentProfile(req: Request) {
  if (!req.profile) throw ApiError.badRequest('Choose a profile', 'PROFILE_REQUIRED');
  return req.profile;
}

const handleSchema = z.object({
  handle: z.string().trim().max(25).nullable(),
  isPublic: z.boolean().default(false),
});

/* ------------------------------------------------------------------ public */
// Readable without a session, so a shared profile link works for anyone.

router.get(
  '/profiles/:handle',
  optionalAuth,
  optionalProfile,
  asyncHandler(async (req, res) => {
    sendData(res, await social.getPublicProfile(param(req, 'handle'), req.profile));
  }),
);

router.get(
  '/profiles/:handle/list',
  asyncHandler(async (req, res) => {
    sendData(res, { items: await social.getSharedList(param(req, 'handle')) });
  }),
);

/* --------------------------------------------------------------- protected */

router.use(requireAuth, requireProfile);

router.put(
  '/handle',
  writeLimiter,
  validate({ body: handleSchema }),
  asyncHandler(async (req, res) => {
    const input = body<z.infer<typeof handleSchema>>(req);
    const profile = await social.setHandle(currentProfile(req), input.handle, input.isPublic);
    sendData(res, { profile: profile.toDTO() });
  }),
);

router.post(
  '/follow/:profileId',
  writeLimiter,
  asyncHandler(async (req, res) => {
    sendData(res, await social.followProfile(currentProfile(req), param(req, 'profileId')));
  }),
);

router.delete(
  '/follow/:profileId',
  writeLimiter,
  asyncHandler(async (req, res) => {
    sendData(res, await social.unfollowProfile(currentProfile(req), param(req, 'profileId')));
  }),
);

router.get(
  '/followers',
  asyncHandler(async (req, res) => {
    sendData(res, { items: await social.listFollows(currentProfile(req)._id, 'followers') });
  }),
);

router.get(
  '/following',
  asyncHandler(async (req, res) => {
    sendData(res, { items: await social.listFollows(currentProfile(req)._id, 'following') });
  }),
);

router.get(
  '/feed',
  asyncHandler(async (req, res) => {
    sendData(res, { items: await social.getFeed(currentProfile(req)) });
  }),
);

router.get(
  '/discover',
  asyncHandler(async (req, res) => {
    sendData(res, { items: await social.discoverProfiles(currentProfile(req)) });
  }),
);

export const socialRoutes = router;
