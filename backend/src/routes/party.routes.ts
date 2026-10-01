import { Router, type Request } from 'express';
import { createPartySchema } from '@shared';
import type { CreatePartyInput } from '@shared';
import { requireAuth, requireProfile } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { body, validate } from '../middleware/validate';
import * as party from '../services/party.service';
import * as notifications from '../services/notification.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler, param, sendData } from '../utils/http';
import { Types } from 'mongoose';

const router = Router();
router.use(requireAuth, requireProfile);

function currentProfile(req: Request) {
  if (!req.profile) throw ApiError.badRequest('Choose a profile', 'PROFILE_REQUIRED');
  return req.profile;
}

/**
 * Party lifecycle over HTTP; the live session runs over Socket.IO.
 *
 * Creating and looking up a party are ordinary requests — they need auth,
 * validation and rate limiting, all of which Express already does well. Only
 * the parts that must be *pushed* (sync, chat, presence) use the socket.
 */
router.post(
  '/',
  writeLimiter,
  validate({ body: createPartySchema }),
  asyncHandler(async (req, res) => {
    const state = await party.createParty(currentProfile(req), body<CreatePartyInput>(req));
    sendData(res, { party: state }, 201);
  }),
);

/** Look up a party before joining, so the UI can show what it is. */
router.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const record = await party.findParty(param(req, 'code'));
    sendData(res, { party: await party.toPartyState(record, currentProfile(req)) });
  }),
);

router.post(
  '/:code/end',
  asyncHandler(async (req, res) => {
    const record = await party.findParty(param(req, 'code'));
    await party.endParty(record, currentProfile(req));
    sendData(res, { ended: true });
  }),
);

/** Invite another profile, which raises a notification for them. */
router.post(
  '/:code/invite',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const profile = currentProfile(req);
    const record = await party.findParty(param(req, 'code'));

    const targetProfileId = (req.body as { profileId?: string })?.profileId;
    if (!targetProfileId || !Types.ObjectId.isValid(targetProfileId)) {
      throw ApiError.badRequest('Choose someone to invite', 'INVALID_ID');
    }

    const { Profile } = await import('../models/Profile');
    const target = await Profile.findById(targetProfileId).select('userId');
    if (!target) throw ApiError.notFound('Profile not found', 'PROFILE_NOT_FOUND');

    await notifications.notify({
      profileId: target._id,
      userId: target.userId,
      kind: 'party_invite',
      title: `${profile.name} invited you to a watch party`,
      body: `Join with code ${record.code}`,
      href: `/party/${record.code}`,
      actorProfileId: profile._id,
    });

    sendData(res, { invited: true });
  }),
);

export const partyRoutes = router;
