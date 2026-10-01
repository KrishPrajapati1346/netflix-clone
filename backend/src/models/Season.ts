import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

export interface SeasonAttrs {
  showId: Types.ObjectId;
  seasonNumber: number;
  name: string;
  overview: string;
  posterUrl?: string | null;
  airDate?: Date | null;
  episodeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SeasonDocument = HydratedDocument<SeasonAttrs> & {
  _id: Types.ObjectId;
};

const seasonSchema = new Schema<SeasonAttrs>(
  {
    showId: {
      type: Schema.Types.ObjectId,
      ref: "TVShow",
      required: true,
      index: true,
    },
    seasonNumber: { type: Number, required: true, min: 0 },
    name: { type: String, required: true, maxlength: 120 },
    overview: { type: String, default: "", maxlength: 3000 },
    posterUrl: { type: String, default: null },
    airDate: { type: Date, default: null },
    episodeCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// A show cannot have two "Season 2" rows, and this doubles as the sort index.
seasonSchema.index({ showId: 1, seasonNumber: 1 }, { unique: true });

export const Season = model<SeasonAttrs, Model<SeasonAttrs>>(
  "Season",
  seasonSchema,
);
