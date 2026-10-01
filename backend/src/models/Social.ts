import { Schema, model, type Model, type Types } from "mongoose";
import { MEDIA_TYPES, type MediaType } from "@shared";

export interface FollowAttrs {
  followerProfileId: Types.ObjectId;
  followerUserId: Types.ObjectId;
  followingProfileId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const followSchema = new Schema<FollowAttrs>(
  {
    followerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    followerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    followingProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
  },
  { timestamps: true },
);

followSchema.index(
  { followerProfileId: 1, followingProfileId: 1 },
  { unique: true },
);

followSchema.index({ followerProfileId: 1, createdAt: -1 });
followSchema.index({ followingProfileId: 1, createdAt: -1 });

export const Follow = model<FollowAttrs, Model<FollowAttrs>>(
  "Follow",
  followSchema,
);

export type ActivityKind =
  "watched" | "rated" | "reviewed" | "listed" | "followed";

export interface ActivityEventAttrs {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  kind: ActivityKind;
  mediaType?: MediaType | null;
  mediaId?: Types.ObjectId | null;
  mediaTitle?: string | null;
  mediaSlug?: string | null;
  targetProfileId?: Types.ObjectId | null;
  targetProfileName?: string | null;
  score?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const activityEventSchema = new Schema<ActivityEventAttrs>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: {
      type: String,
      enum: ["watched", "rated", "reviewed", "listed", "followed"],
      required: true,
    },
    mediaType: { type: String, enum: [...MEDIA_TYPES, null], default: null },
    mediaId: { type: Schema.Types.ObjectId, default: null },
    mediaTitle: { type: String, default: null },
    mediaSlug: { type: String, default: null },
    targetProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
    },
    targetProfileName: { type: String, default: null },
    score: { type: Number, default: null },
  },
  { timestamps: true },
);

activityEventSchema.index({ profileId: 1, createdAt: -1 });
activityEventSchema.index({ createdAt: -1 });

activityEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 24 * 60 * 60 },
);

export const ActivityEvent = model<
  ActivityEventAttrs,
  Model<ActivityEventAttrs>
>("ActivityEvent", activityEventSchema);
