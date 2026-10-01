import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { MEDIA_TYPES, type ListKind, type MediaType } from "@shared";

export interface ListEntryAttrs {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  kind: ListKind;
  mediaType: MediaType;
  mediaId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ListEntryDocument = HydratedDocument<ListEntryAttrs> & {
  _id: Types.ObjectId;
};

const listEntrySchema = new Schema<ListEntryAttrs>(
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
      enum: ["my_list", "favorites", "watch_later"],
      required: true,
    },
    mediaType: { type: String, enum: [...MEDIA_TYPES], required: true },
    mediaId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

listEntrySchema.index(
  { profileId: 1, kind: 1, mediaType: 1, mediaId: 1 },
  { unique: true },
);

listEntrySchema.index({ profileId: 1, kind: 1, createdAt: -1 });

listEntrySchema.index({ profileId: 1, mediaId: 1 });

export const ListEntry = model<ListEntryAttrs, Model<ListEntryAttrs>>(
  "ListEntry",
  listEntrySchema,
);
