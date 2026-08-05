import { z } from 'zod';
import { LANGUAGES, MATURITY_RATINGS, PROFILE_PIN_LENGTH } from '../constants';
import { objectIdSchema } from './common';

const languageCodes = LANGUAGES.map((l) => l.code) as [string, ...string[]];

export const pinSchema = z
  .string()
  .regex(new RegExp(`^\\d{${PROFILE_PIN_LENGTH}}$`), `PIN must be exactly ${PROFILE_PIN_LENGTH} digits`);

export const playbackPreferencesSchema = z.object({
  autoplayNextEpisode: z.boolean().default(true),
  autoplayPreviews: z.boolean().default(true),
  defaultQuality: z.enum(['auto', '1080p', '720p', '480p']).default('auto'),
  subtitleLanguage: z.enum(languageCodes).nullable().default(null),
  subtitlesEnabled: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
});
export type PlaybackPreferences = z.infer<typeof playbackPreferencesSchema>;

export const notificationPreferencesSchema = z.object({
  newContent: z.boolean().default(true),
  partyInvites: z.boolean().default(true),
  followActivity: z.boolean().default(true),
  reviewLikes: z.boolean().default(true),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const createProfileSchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required').max(30),
  avatarKey: z.string().trim().max(120).optional(),
  isKids: z.boolean().default(false),
  language: z.enum(languageCodes).default('en'),
  maturityLimit: z.enum(MATURITY_RATINGS).default('TV-MA'),
  pin: pinSchema.optional(),
});
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  avatarKey: z.string().trim().max(120).optional(),
  avatarUrl: z.string().url().optional(),
  isKids: z.boolean().optional(),
  language: z.enum(languageCodes).optional(),
  maturityLimit: z.enum(MATURITY_RATINGS).optional(),
  playback: playbackPreferencesSchema.partial().optional(),
  notifications: notificationPreferencesSchema.partial().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Set, change, or clear a profile PIN. `pin: null` removes the lock. */
export const setProfilePinSchema = z.object({
  pin: pinSchema.nullable(),
  currentPin: pinSchema.optional(),
});
export type SetProfilePinInput = z.infer<typeof setProfilePinSchema>;

export const selectProfileSchema = z.object({
  profileId: objectIdSchema,
  pin: pinSchema.optional(),
});
export type SelectProfileInput = z.infer<typeof selectProfileSchema>;
