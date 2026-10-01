import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { MEDIA_TYPES, type MediaType } from "@shared";

export interface ReviewAttrs {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  mediaType: MediaType;
  mediaId: Types.ObjectId;
  title: string;
  body: string;
  score: number;
  hasSpoilers: boolean;
  helpfulCount: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<ReviewAttrs> & {
  _id: Types.ObjectId;
};

const reviewSchema = new Schema<ReviewAttrs>(
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
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 6000 },
    score: { type: Number, required: true, min: 0.5, max: 5 },
    hasSpoilers: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index(
  { profileId: 1, mediaType: 1, mediaId: 1 },
  { unique: true },
);

reviewSchema.index({ mediaId: 1, isHidden: 1, helpfulCount: -1 });
reviewSchema.index({ mediaId: 1, isHidden: 1, createdAt: -1 });

export const Review = model<ReviewAttrs, Model<ReviewAttrs>>(
  "Review",
  reviewSchema,
);

export interface HelpfulVoteAttrs {
  reviewId: Types.ObjectId;
  profileId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const helpfulVoteSchema = new Schema<HelpfulVoteAttrs>(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: "Review", required: true },
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
  },
  { timestamps: true },
);

helpfulVoteSchema.index({ reviewId: 1, profileId: 1 }, { unique: true });
helpfulVoteSchema.index({ profileId: 1 });

export const HelpfulVote = model<HelpfulVoteAttrs, Model<HelpfulVoteAttrs>>(
  "HelpfulVote",
  helpfulVoteSchema,
);
