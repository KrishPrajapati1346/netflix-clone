import { Schema, model, type Model, type Types } from "mongoose";

export interface SearchQueryAttrs {
  profileId?: Types.ObjectId | null;
  term: string;
  resultCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const searchQuerySchema = new Schema<SearchQueryAttrs>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", default: null },
    term: { type: String, required: true, maxlength: 120 },
    resultCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

searchQuerySchema.index({ profileId: 1, createdAt: -1 });

searchQuerySchema.index({ createdAt: -1, term: 1 });

searchQuerySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

export const SearchQuery = model<SearchQueryAttrs, Model<SearchQueryAttrs>>(
  "SearchQuery",
  searchQuerySchema,
);
