"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autocompleteQuerySchema = exports.searchQuerySchema = exports.catalogQuerySchema = exports.catalogSortSchema = exports.updateEpisodeSchema = exports.createEpisodeSchema = exports.updateSeasonSchema = exports.createSeasonSchema = exports.updateShowSchema = exports.createShowSchema = exports.updateMovieSchema = exports.createMovieSchema = exports.chapterSchema = exports.subtitleTrackSchema = exports.videoSourceSchema = exports.castMemberSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const common_1 = require("./common");
const languageCodes = constants_1.LANGUAGES.map((l) => l.code);
const csvArray = (inner) => zod_1.z.preprocess((value) => {
    if (value === undefined || value === null || value === "")
        return undefined;
    if (Array.isArray(value))
        return value.flatMap((v) => String(v).split(","));
    return String(value).split(",");
}, zod_1.z.array(inner).optional());
exports.castMemberSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(120),
    character: zod_1.z.string().trim().max(120).optional(),
    profileUrl: zod_1.z.string().url().optional(),
    order: zod_1.z.number().int().min(0).default(0),
});
/** One rendition of a playable asset. `auto` picks the HLS master playlist. */
exports.videoSourceSchema = zod_1.z.object({
    label: zod_1.z.enum(["auto", "1080p", "720p", "480p"]),
    url: zod_1.z.string().min(1, "Source URL is required"),
    type: zod_1.z.enum(["hls", "mp4"]).default("hls"),
});
exports.subtitleTrackSchema = zod_1.z.object({
    language: zod_1.z.enum(languageCodes),
    label: zod_1.z.string().trim().min(1).max(60),
    url: zod_1.z.string().min(1),
    isDefault: zod_1.z.boolean().default(false),
});
exports.chapterSchema = zod_1.z.object({
    kind: zod_1.z.enum(["intro", "recap", "credits"]),
    startSeconds: zod_1.z.number().min(0),
    endSeconds: zod_1.z.number().min(0),
});
const titleBaseSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1, "Title is required").max(200),
    slug: common_1.slugSchema.optional(),
    overview: zod_1.z.string().trim().max(5000).default(""),
    tagline: zod_1.z.string().trim().max(300).optional(),
    genres: zod_1.z.array(zod_1.z.enum(constants_1.GENRES)).min(1, "Pick at least one genre"),
    language: zod_1.z.enum(languageCodes).default("en"),
    maturityRating: zod_1.z.enum(constants_1.MATURITY_RATINGS).default("PG-13"),
    releaseDate: zod_1.z.coerce.date().optional(),
    posterUrl: zod_1.z.string().url().optional(),
    backdropUrl: zod_1.z.string().url().optional(),
    trailerUrl: zod_1.z.string().url().optional(),
    cast: zod_1.z.array(exports.castMemberSchema).default([]),
    directors: zod_1.z.array(zod_1.z.string().trim().max(120)).default([]),
    keywords: zod_1.z.array(zod_1.z.string().trim().max(60)).default([]),
    tmdbId: zod_1.z.number().int().positive().optional(),
    isPublished: zod_1.z.boolean().default(true),
    isFeatured: zod_1.z.boolean().default(false),
});
exports.createMovieSchema = titleBaseSchema.extend({
    runtimeMinutes: zod_1.z.number().int().min(1).max(1000),
    sources: zod_1.z.array(exports.videoSourceSchema).default([]),
    subtitles: zod_1.z.array(exports.subtitleTrackSchema).default([]),
    chapters: zod_1.z.array(exports.chapterSchema).default([]),
});
exports.updateMovieSchema = exports.createMovieSchema.partial();
exports.createShowSchema = titleBaseSchema.extend({
    firstAirDate: zod_1.z.coerce.date().optional(),
    lastAirDate: zod_1.z.coerce.date().optional(),
    status: zod_1.z
        .enum(["returning", "ended", "canceled", "in_production"])
        .default("returning"),
});
exports.updateShowSchema = exports.createShowSchema.partial();
exports.createSeasonSchema = zod_1.z.object({
    showId: common_1.objectIdSchema,
    seasonNumber: zod_1.z.number().int().min(0),
    name: zod_1.z.string().trim().min(1).max(120),
    overview: zod_1.z.string().trim().max(3000).default(""),
    posterUrl: zod_1.z.string().url().optional(),
    airDate: zod_1.z.coerce.date().optional(),
});
exports.updateSeasonSchema = exports.createSeasonSchema
    .partial()
    .omit({ showId: true });
exports.createEpisodeSchema = zod_1.z.object({
    showId: common_1.objectIdSchema,
    seasonId: common_1.objectIdSchema,
    seasonNumber: zod_1.z.number().int().min(0),
    episodeNumber: zod_1.z.number().int().min(0),
    title: zod_1.z.string().trim().min(1).max(200),
    overview: zod_1.z.string().trim().max(3000).default(""),
    stillUrl: zod_1.z.string().url().optional(),
    runtimeMinutes: zod_1.z.number().int().min(1).max(600),
    airDate: zod_1.z.coerce.date().optional(),
    sources: zod_1.z.array(exports.videoSourceSchema).default([]),
    subtitles: zod_1.z.array(exports.subtitleTrackSchema).default([]),
    chapters: zod_1.z.array(exports.chapterSchema).default([]),
    isPublished: zod_1.z.boolean().default(true),
});
exports.updateEpisodeSchema = exports.createEpisodeSchema
    .partial()
    .omit({ showId: true, seasonId: true });
exports.catalogSortSchema = zod_1.z
    .enum(["popularity", "rating", "releaseDate", "title", "runtime", "newest"])
    .default("popularity");
exports.catalogQuerySchema = common_1.paginationSchema.extend({
    type: common_1.mediaTypeSchema.optional(),
    genre: csvArray(zod_1.z.enum(constants_1.GENRES)),
    language: csvArray(zod_1.z.enum(languageCodes)),
    rating: csvArray(common_1.maturityRatingSchema),
    yearFrom: zod_1.z.coerce.number().int().min(1888).max(2200).optional(),
    yearTo: zod_1.z.coerce.number().int().min(1888).max(2200).optional(),
    runtimeMin: zod_1.z.coerce.number().int().min(0).max(1000).optional(),
    runtimeMax: zod_1.z.coerce.number().int().min(0).max(1000).optional(),
    minScore: zod_1.z.coerce.number().min(0).max(10).optional(),
    sort: exports.catalogSortSchema,
    order: zod_1.z.enum(["asc", "desc"]).default("desc"),
    q: zod_1.z.string().trim().max(120).optional(),
});
exports.searchQuerySchema = exports.catalogQuerySchema.extend({
    q: zod_1.z.string().trim().min(1, "Enter something to search for").max(120),
});
exports.autocompleteQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(1).max(120),
    limit: zod_1.z.coerce.number().int().min(1).max(20).default(8),
});
//# sourceMappingURL=media.js.map