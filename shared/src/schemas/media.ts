import { z } from "zod";
import {
  GENRES,
  LANGUAGES,
  MATURITY_RATINGS,
  type LanguageCode,
} from "../constants";
import {
  maturityRatingSchema,
  mediaTypeSchema,
  objectIdSchema,
  paginationSchema,
  slugSchema,
} from "./common";

const languageCodes = LANGUAGES.map((l) => l.code) as [
  LanguageCode,
  ...LanguageCode[],
];

const csvArray = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (Array.isArray(value)) return value.flatMap((v) => String(v).split(","));
    return String(value).split(",");
  }, z.array(inner).optional());

export const castMemberSchema = z.object({
  name: z.string().trim().min(1).max(120),
  character: z.string().trim().max(120).optional(),
  profileUrl: z.string().url().optional(),
  order: z.number().int().min(0).default(0),
});
export type CastMember = z.infer<typeof castMemberSchema>;

/** One rendition of a playable asset. `auto` picks the HLS master playlist. */
export const videoSourceSchema = z.object({
  label: z.enum(["auto", "1080p", "720p", "480p"]),
  url: z.string().min(1, "Source URL is required"),
  type: z.enum(["hls", "mp4"]).default("hls"),
});
export type VideoSource = z.infer<typeof videoSourceSchema>;

export const subtitleTrackSchema = z.object({
  language: z.enum(languageCodes),
  label: z.string().trim().min(1).max(60),
  url: z.string().min(1),
  isDefault: z.boolean().default(false),
});
export type SubtitleTrack = z.infer<typeof subtitleTrackSchema>;

export const chapterSchema = z.object({
  kind: z.enum(["intro", "recap", "credits"]),
  startSeconds: z.number().min(0),
  endSeconds: z.number().min(0),
});
export type Chapter = z.infer<typeof chapterSchema>;

const titleBaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugSchema.optional(),
  overview: z.string().trim().max(5000).default(""),
  tagline: z.string().trim().max(300).optional(),
  genres: z.array(z.enum(GENRES)).min(1, "Pick at least one genre"),
  language: z.enum(languageCodes).default("en"),
  maturityRating: z.enum(MATURITY_RATINGS).default("PG-13"),
  releaseDate: z.coerce.date().optional(),
  posterUrl: z.string().url().optional(),
  backdropUrl: z.string().url().optional(),
  trailerUrl: z.string().url().optional(),
  cast: z.array(castMemberSchema).default([]),
  directors: z.array(z.string().trim().max(120)).default([]),
  keywords: z.array(z.string().trim().max(60)).default([]),
  tmdbId: z.number().int().positive().optional(),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const createMovieSchema = titleBaseSchema.extend({
  runtimeMinutes: z.number().int().min(1).max(1000),
  sources: z.array(videoSourceSchema).default([]),
  subtitles: z.array(subtitleTrackSchema).default([]),
  chapters: z.array(chapterSchema).default([]),
});
export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export const updateMovieSchema = createMovieSchema.partial();
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;

export const createShowSchema = titleBaseSchema.extend({
  firstAirDate: z.coerce.date().optional(),
  lastAirDate: z.coerce.date().optional(),
  status: z
    .enum(["returning", "ended", "canceled", "in_production"])
    .default("returning"),
});
export type CreateShowInput = z.infer<typeof createShowSchema>;
export const updateShowSchema = createShowSchema.partial();
export type UpdateShowInput = z.infer<typeof updateShowSchema>;

export const createSeasonSchema = z.object({
  showId: objectIdSchema,
  seasonNumber: z.number().int().min(0),
  name: z.string().trim().min(1).max(120),
  overview: z.string().trim().max(3000).default(""),
  posterUrl: z.string().url().optional(),
  airDate: z.coerce.date().optional(),
});
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export const updateSeasonSchema = createSeasonSchema
  .partial()
  .omit({ showId: true });
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;

export const createEpisodeSchema = z.object({
  showId: objectIdSchema,
  seasonId: objectIdSchema,
  seasonNumber: z.number().int().min(0),
  episodeNumber: z.number().int().min(0),
  title: z.string().trim().min(1).max(200),
  overview: z.string().trim().max(3000).default(""),
  stillUrl: z.string().url().optional(),
  runtimeMinutes: z.number().int().min(1).max(600),
  airDate: z.coerce.date().optional(),
  sources: z.array(videoSourceSchema).default([]),
  subtitles: z.array(subtitleTrackSchema).default([]),
  chapters: z.array(chapterSchema).default([]),
  isPublished: z.boolean().default(true),
});
export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>;
export const updateEpisodeSchema = createEpisodeSchema
  .partial()
  .omit({ showId: true, seasonId: true });
export type UpdateEpisodeInput = z.infer<typeof updateEpisodeSchema>;

export const catalogSortSchema = z
  .enum(["popularity", "rating", "releaseDate", "title", "runtime", "newest"])
  .default("popularity");

export const catalogQuerySchema = paginationSchema.extend({
  type: mediaTypeSchema.optional(),
  genre: csvArray(z.enum(GENRES)),
  language: csvArray(z.enum(languageCodes)),
  rating: csvArray(maturityRatingSchema),
  yearFrom: z.coerce.number().int().min(1888).max(2200).optional(),
  yearTo: z.coerce.number().int().min(1888).max(2200).optional(),
  runtimeMin: z.coerce.number().int().min(0).max(1000).optional(),
  runtimeMax: z.coerce.number().int().min(0).max(1000).optional(),
  minScore: z.coerce.number().min(0).max(10).optional(),
  sort: catalogSortSchema,
  order: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().trim().max(120).optional(),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const searchQuerySchema = catalogQuerySchema.extend({
  q: z.string().trim().min(1, "Enter something to search for").max(120),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
