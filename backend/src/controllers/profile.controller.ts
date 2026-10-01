import type {
  CreateProfileInput,
  SelectProfileInput,
  SetProfilePinInput,
  UpdateProfileInput,
} from '@shared';
import type { Request } from 'express';
import * as profiles from '../services/profile.service';
import { ApiError } from '../utils/ApiError';
import { clearProfileCookie, setProfileCookie } from '../utils/cookies';
import { asyncHandler, param, sendData } from '../utils/http';
import { body } from '../middleware/validate';

function currentUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const list = asyncHandler(async (req, res) => {
  const items = await profiles.listProfiles(currentUser(req));
  sendData(res, { profiles: items, avatars: profiles.AVATAR_KEYS });
});

export const create = asyncHandler(async (req, res) => {
  const profile = await profiles.createProfile(currentUser(req), body<CreateProfileInput>(req));
  sendData(res, { profile }, 201);
});

export const update = asyncHandler(async (req, res) => {
  const profile = await profiles.updateProfile(
    currentUser(req),
    param(req, 'id'),
    body<UpdateProfileInput>(req),
  );
  sendData(res, { profile });
});

export const setPin = asyncHandler(async (req, res) => {
  const profile = await profiles.setProfilePin(
    currentUser(req),
    param(req, 'id'),
    body<SetProfilePinInput>(req),
  );
  sendData(res, { profile });
});

export const remove = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  await profiles.deleteProfile(user, param(req, 'id'));

  // If the deleted profile was the active one, its grant is now dangling.
  // Clearing the cookie sends the client back to the picker instead of
  // letting it retry with a grant that will never resolve again.
  if (req.profile && req.profile._id.toString() === param(req, 'id')) {
    clearProfileCookie(res);
  }

  sendData(res, { deleted: true });
});

export const select = asyncHandler(async (req, res) => {
  const input = body<SelectProfileInput>(req);
  const result = await profiles.selectProfile(currentUser(req), input.profileId, input.pin);

  // Mirrored into a cookie so a full page load can restore the active profile
  // without a round trip; the client also keeps it for the request header.
  setProfileCookie(res, result.profileToken);
  sendData(res, result);
});

export const active = asyncHandler(async (req, res) => {
  if (!req.profile) throw ApiError.badRequest('No profile selected', 'PROFILE_REQUIRED');
  sendData(res, { profile: req.profile.toDTO() });
});

export const clear = asyncHandler(async (_req, res) => {
  clearProfileCookie(res);
  sendData(res, { cleared: true });
});
