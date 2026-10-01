import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { COMPLETION_THRESHOLD, MEDIA_TYPES, type MediaType } from "@shared";

export interface WatchProgressAttrs {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  mediaType: MediaType;
  mediaId: Types.ObjectId;
  episodeId?: Types.ObjectId | null;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WatchProgressDocument = HydratedDocument<WatchProgressAttrs> & {
  _id: Types.ObjectId;
};

const watchProgressSchema = new Schema<WatchProgressAttrs>(
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
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", default: null },
    positionSeconds: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, required: true, min: 1 },
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

watchProgressSchema.index(
  { profileId: 1, mediaType: 1, mediaId: 1, episodeId: 1 },
  { unique: true },
);

watchProgressSchema.index({ profileId: 1, completed: 1, lastWatchedAt: -1 });

watchProgressSchema.index({ profileId: 1, mediaId: 1, lastWatchedAt: -1 });

export function progressPercent(
  doc: Pick<WatchProgressAttrs, "positionSeconds" | "durationSeconds">,
): number {
  if (doc.durationSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, doc.positionSeconds / doc.durationSeconds));
}

export function isComplete(
  positionSeconds: number,
  durationSeconds: number,
): boolean {
  if (durationSeconds <= 0) return false;
  return positionSeconds / durationSeconds >= COMPLETION_THRESHOLD;
}

export const WatchProgress = model<
  WatchProgressAttrs,
  Model<WatchProgressAttrs>
>("WatchProgress", watchProgressSchema);
