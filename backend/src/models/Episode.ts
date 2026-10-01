import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import type { Chapter, SubtitleTrack, VideoSource } from "@shared";
import {
  chapterSchema,
  subtitleSchema,
  videoSourceSchema,
} from "./media-common";

export interface EpisodeAttrs {
  showId: Types.ObjectId;
  seasonId: Types.ObjectId;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string;
  stillUrl?: string | null;
  runtimeMinutes: number;
  airDate?: Date | null;
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
  chapters: Chapter[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type EpisodeDocument = HydratedDocument<EpisodeAttrs> & {
  _id: Types.ObjectId;
};

const episodeSchema = new Schema<EpisodeAttrs>(
  {
    showId: {
      type: Schema.Types.ObjectId,
      ref: "TVShow",
      required: true,
      index: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
      index: true,
    },
    seasonNumber: { type: Number, required: true, min: 0 },
    episodeNumber: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, maxlength: 200 },
    overview: { type: String, default: "", maxlength: 3000 },
    stillUrl: { type: String, default: null },
    runtimeMinutes: { type: Number, required: true, min: 1, max: 600 },
    airDate: { type: Date, default: null },
    sources: { type: [videoSourceSchema], default: [] },
    subtitles: { type: [subtitleSchema], default: [] },
    chapters: { type: [chapterSchema], default: [] },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);


episodeSchema.index(
  { showId: 1, seasonNumber: 1, episodeNumber: 1 },
  { unique: true },
);

export const Episode = model<EpisodeAttrs, Model<EpisodeAttrs>>(
  "Episode",
  episodeSchema,
);
