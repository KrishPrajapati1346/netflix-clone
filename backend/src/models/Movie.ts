import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import type { Chapter, SubtitleTrack, VideoSource } from "@shared";
import {
  applyCatalogIndexes,
  chapterSchema,
  subtitleSchema,
  titleBaseDefinition,
  videoSourceSchema,
  type TitleBaseAttrs,
} from "./media-common";

export interface MovieAttrs extends TitleBaseAttrs {
  runtimeMinutes: number;
  releaseDate?: Date | null;
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
  chapters: Chapter[];
}

export type MovieDocument = HydratedDocument<MovieAttrs> & {
  _id: Types.ObjectId;
};
export type MovieModel = Model<MovieAttrs>;

const movieSchema = new Schema<MovieAttrs, MovieModel>(
  {
    ...titleBaseDefinition,
    runtimeMinutes: { type: Number, required: true, min: 1, max: 1000 },
    releaseDate: { type: Date, default: null },
    sources: { type: [videoSourceSchema], default: [] },
    subtitles: { type: [subtitleSchema], default: [] },
    chapters: { type: [chapterSchema], default: [] },
  },
  { timestamps: true },
);

applyCatalogIndexes(movieSchema);
movieSchema.index({ isPublished: 1, releaseDate: -1 });
movieSchema.index({ isPublished: 1, runtimeMinutes: 1 });

export const Movie = model<MovieAttrs, MovieModel>("Movie", movieSchema);
