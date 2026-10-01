import bcrypt from "bcryptjs";
import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import {
  KIDS_ALLOWED_RATINGS,
  LANGUAGES,
  MATURITY_RATINGS,
  type LanguageCode,
  type MaturityRating,
  type NotificationPreferences,
  type PlaybackPreferences,
  type ProfileDTO,
} from "@shared";

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
const PIN_ROUNDS = 10;

export interface ProfileAttrs {
  userId: Types.ObjectId;
  name: string;
  avatarKey: string;
  avatarUrl?: string | null;
  isKids: boolean;
  handle?: string | null;
  isPublic: boolean;
  pinHash?: string | null;
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
  allowedRatings(): MaturityRating[];
}

export type ProfileDocument = HydratedDocument<ProfileAttrs, ProfileMethods> & {
  _id: Types.ObjectId;
};
export type ProfileModel = Model<
  ProfileAttrs,
  Record<string, never>,
  ProfileMethods
>;

const playbackSchema = new Schema<PlaybackPreferences>(
  {
    autoplayNextEpisode: { type: Boolean, default: true },
    autoplayPreviews: { type: Boolean, default: true },
    defaultQuality: {
      type: String,
      enum: ["auto", "1080p", "720p", "480p"],
      default: "auto",
    },
    subtitleLanguage: {
      type: String,
      enum: [...LANGUAGE_CODES, null],
      default: null,
    },
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    avatarKey: { type: String, default: "ember" },
    avatarUrl: { type: String, default: null },
    isKids: { type: Boolean, default: false },
    handle: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      maxlength: 24,
    },
    isPublic: { type: Boolean, default: false },
    pinHash: { type: String, default: null, select: false },
    isPinProtected: { type: Boolean, default: false },
    language: { type: String, enum: LANGUAGE_CODES, default: "en" },
    maturityLimit: { type: String, enum: MATURITY_RATINGS, default: "TV-MA" },
    playback: { type: playbackSchema, default: () => ({}) },
    notifications: { type: notificationSchema, default: () => ({}) },
  },
  { timestamps: true },
);

profileSchema.index({ userId: 1, name: 1 }, { unique: true });

profileSchema.index(
  { handle: 1 },
  { unique: true, partialFilterExpression: { handle: { $type: "string" } } },
);

profileSchema.methods.verifyPin = async function (
  this: ProfileDocument,
  candidate: string,
) {
  if (!this.isPinProtected) return true;
  if (!this.pinHash) {
    throw new Error("verifyPin requires the pinHash field to be selected");
  }
  return bcrypt.compare(candidate, this.pinHash);
};

profileSchema.methods.setPin = async function (
  this: ProfileDocument,
  pin: string | null,
) {
  this.pinHash = pin === null ? null : await bcrypt.hash(pin, PIN_ROUNDS);
  this.isPinProtected = pin !== null;
};

profileSchema.methods.allowedRatings = function (
  this: ProfileDocument,
): MaturityRating[] {
  if (this.isKids) return [...KIDS_ALLOWED_RATINGS];
  const ceiling = MATURITY_RATINGS.indexOf(this.maturityLimit);

  const isTv = (r: MaturityRating) => r.startsWith("TV-");
  const limitIsTv = isTv(this.maturityLimit);
  return MATURITY_RATINGS.filter((rating) => {
    const idx = MATURITY_RATINGS.indexOf(rating);
    if (isTv(rating) === limitIsTv) return idx <= ceiling;

    return severityTier(rating) <= severityTier(this.maturityLimit);
  });
};

function severityTier(rating: MaturityRating): number {
  switch (rating) {
    case "G":
    case "TV-Y":
    case "TV-G":
      return 0;
    case "PG":
    case "TV-PG":
      return 1;
    case "PG-13":
    case "TV-14":
      return 2;
    case "R":
    case "TV-MA":
      return 3;
    case "NC-17":
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
    handle: this.handle ?? null,
    isPublic: this.isPublic,

    hasPin: this.isPinProtected,
    language: this.language,
    maturityLimit: this.maturityLimit,
    playback: this.playback,
    notifications: this.notifications,
    createdAt: this.createdAt.toISOString(),
  };
};

export const Profile = model<ProfileAttrs, ProfileModel>(
  "Profile",
  profileSchema,
);
export { severityTier };
