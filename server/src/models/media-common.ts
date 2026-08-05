import { Schema } from 'mongoose';
import {
  GENRES,
  LANGUAGES,
  MATURITY_RATINGS,
  type CastMember,
  type Chapter,
  type Genre,
  type LanguageCode,
  type MaturityRating,
  type SubtitleTrack,
  type VideoSource,
} from '@kinora/shared';

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/**
 * Sub-documents shared by movies and episodes.
 *
 * These are embedded rather than referenced: a video source has no life of its
 * own outside its title, is always read alongside it, and is bounded in size —
 * the three conditions that make embedding the right call in MongoDB.
 */

export const castSchema = new Schema<CastMember>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    character: { type: String, trim: true, maxlength: 120 },
    profileUrl: { type: String },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

export const videoSourceSchema = new Schema<VideoSource>(
  {
    label: { type: String, enum: ['auto', '1080p', '720p', '480p'], required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['hls', 'mp4'], default: 'hls' },
  },
  { _id: false },
);

export const subtitleSchema = new Schema<SubtitleTrack>(
  {
    language: { type: String, enum: LANGUAGE_CODES, required: true },
    label: { type: String, required: true, maxlength: 60 },
    url: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

export const chapterSchema = new Schema<Chapter>(
  {
    kind: { type: String, enum: ['intro', 'recap', 'credits'], required: true },
    startSeconds: { type: Number, required: true, min: 0 },
    endSeconds: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/** Fields every browsable title carries, regardless of movie or show. */
export interface TitleBaseAttrs {
  title: string;
  slug: string;
  overview: string;
  tagline?: string | null;
  genres: Genre[];
  language: LanguageCode;
  maturityRating: MaturityRating;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  trailerUrl?: string | null;
  cast: CastMember[];
  directors: string[];
  keywords: string[];
  tmdbId?: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  /** Blended engagement score; recomputed by the analytics job, seeded on ingest. */
  popularity: number;
  /** Denormalised aggregate of the Rating collection, 0–5. */
  averageScore: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const titleBaseDefinition = {
  title: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true },
  overview: { type: String, default: '', maxlength: 5000 },
  tagline: { type: String, default: null, maxlength: 300 },
  // Two type notes on this block:
  //  - The shared constants are `as const` tuples; Mongoose's `enum` option is
  //    typed mutable, so they are spread into copies.
  //  - The defaults are cast to their literal union. This object is declared
  //    standalone rather than inline in `new Schema<T>(...)`, so there is no
  //    contextual type to keep `'en'` from widening to `string`.
  genres: { type: [{ type: String, enum: [...GENRES] }], default: [] },
  language: { type: String, enum: LANGUAGE_CODES, default: 'en' as LanguageCode },
  maturityRating: {
    type: String,
    enum: [...MATURITY_RATINGS],
    default: 'PG-13' as MaturityRating,
  },
  posterUrl: { type: String, default: null },
  backdropUrl: { type: String, default: null },
  trailerUrl: { type: String, default: null },
  cast: { type: [castSchema], default: [] },
  directors: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  tmdbId: { type: Number, default: null },
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  popularity: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
};

/**
 * Index set applied to both catalog collections.
 *
 * Every browse query filters on `isPublished` first, so it leads each compound
 * index — a prefix that does not match the query's leading filter is an index
 * the planner will not use.
 */
export function applyCatalogIndexes(schema: Schema): void {
  schema.index({ isPublished: 1, popularity: -1 });
  schema.index({ isPublished: 1, averageScore: -1 });
  schema.index({ isPublished: 1, createdAt: -1 });
  schema.index({ isPublished: 1, genres: 1, popularity: -1 });
  schema.index({ isPublished: 1, isFeatured: 1 });
  schema.index({ tmdbId: 1 }, { sparse: true });

  // Fallback full-text search for local/community MongoDB. On Atlas the richer
  // `titles_search` index takes over; see search.service.ts for the switch.
  schema.index(
    { title: 'text', overview: 'text', keywords: 'text', directors: 'text' },
    { weights: { title: 10, keywords: 4, directors: 2, overview: 1 }, name: 'title_text_search' },
  );
}
