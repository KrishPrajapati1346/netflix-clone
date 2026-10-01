import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { MEDIA_TYPES, type MediaType } from "@shared";

export interface RatingAttrs {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  mediaType: MediaType;
  mediaId: Types.ObjectId;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RatingDocument = HydratedDocument<RatingAttrs> & {
  _id: Types.ObjectId;
};

const ratingSchema = new Schema<RatingAttrs>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaType: { type: String, enum: [...MEDIA_TYPES], required: true },
    mediaId: { type: Schema.Types.ObjectId, required: true },
    score: { type: Number, required: true, min: 0.5, max: 5 },
  },
  { timestamps: true },
);

ratingSchema.index(
  { profileId: 1, mediaType: 1, mediaId: 1 },
  { unique: true },
);

ratingSchema.index({ mediaId: 1, score: -1 });

ratingSchema.index({ profileId: 1, score: -1 });

export const Rating = model<RatingAttrs, Model<RatingAttrs>>(
  "Rating",
  ratingSchema,
);

export interface ReactionAttrs {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  mediaType: MediaType;
  mediaId: Types.ObjectId;
  reaction: "like" | "dislike";
  createdAt: Date;
  updatedAt: Date;
}

export type ReactionDocument = HydratedDocument<ReactionAttrs> & {
  _id: Types.ObjectId;
};

const reactionSchema = new Schema<ReactionAttrs>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaType: { type: String, enum: [...MEDIA_TYPES], required: true },
    mediaId: { type: Schema.Types.ObjectId, required: true },
    reaction: { type: String, enum: ["like", "dislike"], required: true },
  },
  { timestamps: true },
);

reactionSchema.index(
  { profileId: 1, mediaType: 1, mediaId: 1 },
  { unique: true },
);
reactionSchema.index({ profileId: 1, reaction: 1, updatedAt: -1 });

export const Reaction = model<ReactionAttrs, Model<ReactionAttrs>>(
  "Reaction",
  reactionSchema,
);
