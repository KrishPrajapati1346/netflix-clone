import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import {
  applyCatalogIndexes,
  titleBaseDefinition,
  type TitleBaseAttrs,
} from "./media-common";

export type ShowStatus = "returning" | "ended" | "canceled" | "in_production";

export interface TVShowAttrs extends TitleBaseAttrs {
  firstAirDate?: Date | null;
  lastAirDate?: Date | null;
  status: ShowStatus;
  seasonCount: number;
  episodeCount: number;
  averageRuntimeMinutes: number;
}

export type TVShowDocument = HydratedDocument<TVShowAttrs> & {
  _id: Types.ObjectId;
};
export type TVShowModel = Model<TVShowAttrs>;

const tvShowSchema = new Schema<TVShowAttrs, TVShowModel>(
  {
    ...titleBaseDefinition,
    firstAirDate: { type: Date, default: null },
    lastAirDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["returning", "ended", "canceled", "in_production"],
      default: "returning",
    },
    seasonCount: { type: Number, default: 0 },
    episodeCount: { type: Number, default: 0 },
    averageRuntimeMinutes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyCatalogIndexes(tvShowSchema);
tvShowSchema.index({ isPublished: 1, firstAirDate: -1 });

export const TVShow = model<TVShowAttrs, TVShowModel>("TVShow", tvShowSchema);
