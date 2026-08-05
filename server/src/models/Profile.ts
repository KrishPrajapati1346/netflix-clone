import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import {
  KIDS_ALLOWED_RATINGS,
  LANGUAGES,
  MATURITY_RATINGS,
  type LanguageCode,
  type MaturityRating,
  type NotificationPreferences,
  type PlaybackPreferences,
  type ProfileDTO,
} from '@kinora/shared';

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
const PIN_ROUNDS = 10;

export interface ProfileAttrs {
  userId: Types.ObjectId;
  name: string;
  /** Key into the bundled avatar set; `avatarUrl` overrides it when uploaded. */
  avatarKey: string;
  avatarUrl?: string | null;
  isKids: boolean;
  pinHash?: string | null;
  /**
   * Mirrors `pinHash !== null`. Denormalised because `pinHash` is `select:
   * false`, so deriving "is this profile locked?" from it would quietly report
   * "unlocked" on every query that did not explicitly select the hash.
   */
  isPinProtected: boolean;
  language: LanguageCode;
  maturityLimit: MaturityRating;
  playback: PlaybackPreferences;
  notifications: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileMethods {
  verifyPin(candidate: string): Promise<boolean>;
  setPin(pin: string | null): Promise<void>;
  toDTO(): ProfileDTO;
  /** Ratings this profile is permitted to see, honouring the kids flag. */
  allowedRatings(): MaturityRating[];
}

export type ProfileDocument = HydratedDocument<ProfileAttrs, ProfileMethods> & { _id: Types.ObjectId };
export type ProfileModel = Model<ProfileAttrs, Record<string, never>, ProfileMethods>;

const playbackSchema = new Schema<PlaybackPreferences>(
  {
    autoplayNextEpisode: { type: Boolean, default: true },
    autoplayPreviews: { type: Boolean, default: true },
    defaultQuality: { type: String, enum: ['auto', '1080p', '720p', '480p'], default: 'auto' },
    subtitleLanguage: { type: String, enum: [...LANGUAGE_CODES, null], default: null },
    subtitlesEnabled: { type: Boolean, default: false },
    reducedMotion: { type: Boolean, default: false },
  },
  { _id: false },
);

const notificationSchema = new Schema<NotificationPreferences>(
  {
    newContent: { type: Boolean, default: true },
    partyInvites: { type: Boolean, default: true },
    followActivity: { type: Boolean, default: true },
    reviewLikes: { type: Boolean, default: true },
  },
  { _id: false },
);

const profileSchema = new Schema<ProfileAttrs, ProfileModel, ProfileMethods>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    avatarKey: { type: String, default: 'ember' },
    avatarUrl: { type: String, default: null },
    isKids: { type: Boolean, default: false },
    pinHash: { type: String, default: null, select: false },
    isPinProtected: { type: Boolean, default: false },
    language: { type: String, enum: LANGUAGE_CODES, default: 'en' },
    maturityLimit: { type: String, enum: MATURITY_RATINGS, default: 'TV-MA' },
    playback: { type: playbackSchema, default: () => ({}) },
    notifications: { type: notificationSchema, default: () => ({}) },
  },
  { timestamps: true },
);

// Profile names must be distinguishable within one account, but two different
// accounts may both have a profile called "Sam".
profileSchema.index({ userId: 1, name: 1 }, { unique: true });

profileSchema.methods.verifyPin = async function (this: ProfileDocument, candidate: string) {
  if (!this.isPinProtected) return true; // No lock to satisfy.
  if (!this.pinHash) {
    // The profile *is* locked but the hash was not selected. Failing open here
    // would hand out access to every PIN-protected profile, so fail closed and
    // make the programming error loud.
    throw new Error('verifyPin requires the pinHash field to be selected');
  }
  return bcrypt.compare(candidate, this.pinHash);
};

profileSchema.methods.setPin = async function (this: ProfileDocument, pin: string | null) {
  this.pinHash = pin === null ? null : await bcrypt.hash(pin, PIN_ROUNDS);
  this.isPinProtected = pin !== null;
};

profileSchema.methods.allowedRatings = function (this: ProfileDocument): MaturityRating[] {
  if (this.isKids) return [...KIDS_ALLOWED_RATINGS];
  const ceiling = MATURITY_RATINGS.indexOf(this.maturityLimit);
  // MATURITY_RATINGS interleaves film and TV scales, so an index cut alone
  // would let "TV-Y" through a "G" ceiling. Compare within each scale instead.
  const isTv = (r: MaturityRating) => r.startsWith('TV-');
  const limitIsTv = isTv(this.maturityLimit);
  return MATURITY_RATINGS.filter((rating) => {
    const idx = MATURITY_RATINGS.indexOf(rating);
    if (isTv(rating) === limitIsTv) return idx <= ceiling;
    // Cross-scale: allow anything at or below the equivalent severity tier.
    return severityTier(rating) <= severityTier(this.maturityLimit);
  });
};

/** Maps both rating scales onto one 0–4 severity ladder for comparison. */
function severityTier(rating: MaturityRating): number {
  switch (rating) {
    case 'G':
    case 'TV-Y':
    case 'TV-G':
      return 0;
    case 'PG':
    case 'TV-PG':
      return 1;
    case 'PG-13':
    case 'TV-14':
      return 2;
    case 'R':
    case 'TV-MA':
      return 3;
    case 'NC-17':
      return 4;
    default:
      return 4;
  }
}

profileSchema.methods.toDTO = function (this: ProfileDocument): ProfileDTO {
  return {
    id: this._id.toString(),
    name: this.name,
    avatarKey: this.avatarKey,
    avatarUrl: this.avatarUrl ?? null,
    isKids: this.isKids,
    // Never expose the hash itself — only whether a lock exists.
    hasPin: this.isPinProtected,
    language: this.language,
    maturityLimit: this.maturityLimit,
    playback: this.playback,
    notifications: this.notifications,
    createdAt: this.createdAt.toISOString(),
  };
};

export const Profile = model<ProfileAttrs, ProfileModel>('Profile', profileSchema);
export { severityTier };
