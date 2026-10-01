import { Schema, model, type Model, type Types } from "mongoose";

export type NotificationKind =
  "follow" | "party_invite" | "new_content" | "review_like" | "system";

export interface NotificationAttrs {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  actorProfileId?: Types.ObjectId | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationAttrs>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["follow", "party_invite", "new_content", "review_like", "system"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: "", maxlength: 400 },
    href: { type: String, default: null },
    actorProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ profileId: 1, createdAt: -1 });

notificationSchema.index({ profileId: 1, readAt: 1 });

notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

export const Notification = model<NotificationAttrs, Model<NotificationAttrs>>(
  "Notification",
  notificationSchema,
);
