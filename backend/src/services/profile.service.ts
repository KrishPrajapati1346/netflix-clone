import { Types } from 'mongoose';
import {
  MAX_PROFILES_PER_ACCOUNT,
  type CreateProfileInput,
  type ProfileDTO,
  type SetProfilePinInput,
  type UpdateProfileInput,
} from '@shared';
import { ListEntry } from '../models/ListEntry';
import { Profile, type ProfileDocument } from '../models/Profile';
import { Rating, Reaction } from '../models/Rating';
import { Review } from '../models/Review';
import { WatchProgress } from '../models/WatchProgress';
import type { UserDocument } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { signProfileToken } from './token.service';

/**
 * Profile CRUD and selection.
 *
 * Every read and write filters on `userId`, so a profile id belonging to
 * another account simply does not resolve. That is an authorization check, not
 * a lookup optimisation: without it, any signed-in user could pass a stolen
 * profile id and operate on someone else's library.
 */

/** Bundled avatar set — no upload needed, so profiles work with zero credentials. */
export const AVATAR_KEYS = [
  'ember',
  'aurora',
  'cobalt',
  'moss',
  'plum',
  'sand',
  'slate',
  'coral',
] as const;

export async function listProfiles(user: UserDocument): Promise<ProfileDTO[]> {
  const profiles = await Profile.find({ userId: user._id }).sort({ createdAt: 1 });
  return profiles.map((profile) => profile.toDTO());
}

export async function createProfile(
  user: UserDocument,
  input: CreateProfileInput,
): Promise<ProfileDTO> {
  const count = await Profile.countDocuments({ userId: user._id });
  if (count >= MAX_PROFILES_PER_ACCOUNT) {
    throw ApiError.badRequest(
      `An account can have at most ${MAX_PROFILES_PER_ACCOUNT} profiles`,
      'PROFILE_LIMIT_REACHED',
    );
  }

  const profile = new Profile({
    userId: user._id,
    name: input.name,
    avatarKey: input.avatarKey ?? 'ember',
    isKids: input.isKids,
    language: input.language,
    // A kids profile is capped regardless of what was requested — the whole
    // point of the flag is that it cannot be widened from the client.
    maturityLimit: input.isKids ? 'PG' : input.maturityLimit,
  });

  if (input.pin) await profile.setPin(input.pin);

  try {
    await profile.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw ApiError.conflict('A profile with that name already exists', 'PROFILE_NAME_TAKEN');
    }
    throw error;
  }

  return profile.toDTO();
}

/** Loads a profile, proving ownership in the same query. */
export async function getOwnedProfile(
  user: UserDocument,
  profileId: string,
  options: { withPin?: boolean } = {},
): Promise<ProfileDocument> {
  if (!Types.ObjectId.isValid(profileId)) {
    throw ApiError.notFound('Profile not found', 'PROFILE_NOT_FOUND');
  }

  const query = Profile.findOne({ _id: profileId, userId: user._id });
  if (options.withPin) query.select('+pinHash');

  const profile = await query;
  if (!profile) throw ApiError.notFound('Profile not found', 'PROFILE_NOT_FOUND');
  return profile;
}

export async function updateProfile(
  user: UserDocument,
  profileId: string,
  input: UpdateProfileInput,
): Promise<ProfileDTO> {
  const profile = await getOwnedProfile(user, profileId);

  if (input.name !== undefined) profile.name = input.name;
  if (input.avatarKey !== undefined) profile.avatarKey = input.avatarKey;
  if (input.avatarUrl !== undefined) profile.avatarUrl = input.avatarUrl;
  if (input.language !== undefined) profile.language = input.language;
  if (input.isKids !== undefined) profile.isKids = input.isKids;

  if (input.maturityLimit !== undefined) profile.maturityLimit = input.maturityLimit;
  // Re-clamp after any change: flipping a profile to kids must also tighten the
  // limit, even when the request did not mention it.
  if (profile.isKids) profile.maturityLimit = 'PG';

  if (input.playback) profile.playback = { ...profile.playback, ...input.playback };
  if (input.notifications) profile.notifications = { ...profile.notifications, ...input.notifications };

  try {
    await profile.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw ApiError.conflict('A profile with that name already exists', 'PROFILE_NAME_TAKEN');
    }
    throw error;
  }

  return profile.toDTO();
}

export async function setProfilePin(
  user: UserDocument,
  profileId: string,
  input: SetProfilePinInput,
): Promise<ProfileDTO> {
  const profile = await getOwnedProfile(user, profileId, { withPin: true });

  // Changing or clearing an existing PIN requires proving you know it —
  // otherwise anyone with the account password could silently unlock a profile
  // that was deliberately locked away from them.
  if (profile.isPinProtected) {
    if (!input.currentPin) {
      throw ApiError.badRequest('Enter the current PIN to change it', 'CURRENT_PIN_REQUIRED');
    }
    if (!(await profile.verifyPin(input.currentPin))) {
      throw ApiError.unauthorized('That PIN is incorrect', 'INVALID_PIN');
    }
  }

  await profile.setPin(input.pin);
  await profile.save();
  return profile.toDTO();
}

export async function deleteProfile(user: UserDocument, profileId: string): Promise<void> {
  const count = await Profile.countDocuments({ userId: user._id });
  if (count <= 1) {
    // Every account must keep at least one profile, or the picker becomes a
    // dead end with no way back.
    throw ApiError.badRequest('An account needs at least one profile', 'LAST_PROFILE');
  }

  const profile = await getOwnedProfile(user, profileId);

  // Remove the profile's data with it. Leaving orphaned rows behind would let a
  // recreated profile inherit a stranger's history, and quietly grows the
  // 512 MB free-tier database forever.
  await Promise.all([
    WatchProgress.deleteMany({ profileId: profile._id }),
    ListEntry.deleteMany({ profileId: profile._id }),
    Rating.deleteMany({ profileId: profile._id }),
    Reaction.deleteMany({ profileId: profile._id }),
    Review.deleteMany({ profileId: profile._id }),
  ]);

  await profile.deleteOne();
}

export interface SelectedProfile {
  profile: ProfileDTO;
  /** Signed grant the client sends on every profile-scoped request. */
  profileToken: string;
}

/**
 * Unlocks a profile and mints its grant.
 *
 * The PIN is verified here, once, and the resulting token is what later
 * requests present. Checking the PIN on every request would mean either
 * storing it client-side or prompting constantly.
 */
export async function selectProfile(
  user: UserDocument,
  profileId: string,
  pin?: string,
): Promise<SelectedProfile> {
  const profile = await getOwnedProfile(user, profileId, { withPin: true });

  if (profile.isPinProtected) {
    if (!pin) throw ApiError.forbidden('This profile is locked', 'PIN_REQUIRED');
    if (!(await profile.verifyPin(pin))) {
      throw ApiError.unauthorized('That PIN is incorrect', 'INVALID_PIN');
    }
  }

  return {
    profile: profile.toDTO(),
    profileToken: signProfileToken(user._id.toString(), profile._id.toString()),
  };
}
