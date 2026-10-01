import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { MEDIA_TYPES, type MediaType } from "@shared";

export interface WatchPartyAttrs {
  code: string;
  hostProfileId: Types.ObjectId;
  hostUserId: Types.ObjectId;
  mediaType: MediaType;
  mediaId: Types.ObjectId;
  episodeId?: Types.ObjectId | null;
  positionSeconds: number;
  isPlaying: boolean;
  lastSyncAt: Date;
  hostControlsOnly: boolean;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WatchPartyDocument = HydratedDocument<WatchPartyAttrs> & {
  _id: Types.ObjectId;
};

const watchPartySchema = new Schema<WatchPartyAttrs>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 8,
    },
    hostProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    hostUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaType: { type: String, enum: [...MEDIA_TYPES], required: true },
    mediaId: { type: Schema.Types.ObjectId, required: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", default: null },
    positionSeconds: { type: Number, default: 0 },
    isPlaying: { type: Boolean, default: false },
    lastSyncAt: { type: Date, default: () => new Date() },
    hostControlsOnly: { type: Boolean, default: true },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

watchPartySchema.index({ updatedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const WatchParty = model<WatchPartyAttrs, Model<WatchPartyAttrs>>(
  "WatchParty",
  watchPartySchema,
);

export interface PartyMessageAttrs {
  partyId: Types.ObjectId;
  profileId: Types.ObjectId;
  profileName: string;
  kind: "chat" | "reaction" | "system";
  body: string;
  atSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const partyMessageSchema = new Schema<PartyMessageAttrs>(
  {
    partyId: {
      type: Schema.Types.ObjectId,
      ref: "WatchParty",
      required: true,
      index: true,
    },
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },

    profileName: { type: String, required: true, maxlength: 30 },
    kind: {
      type: String,
      enum: ["chat", "reaction", "system"],
      default: "chat",
    },
    body: { type: String, required: true, maxlength: 500 },
    atSeconds: { type: Number, default: 0 },
  },
  { timestamps: true },
);

partyMessageSchema.index({ partyId: 1, createdAt: 1 });
partyMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 24 * 60 * 60 },
);

export const PartyMessage = model<PartyMessageAttrs, Model<PartyMessageAttrs>>(
  "PartyMessage",
  partyMessageSchema,
);
