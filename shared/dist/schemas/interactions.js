"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportContentSchema = exports.reviewQuerySchema = exports.updateReviewSchema = exports.createReviewSchema = exports.ratingSchema = exports.reactionSchema = exports.listMutationSchema = exports.listKindSchema = exports.progressUpdateSchema = exports.playableRefSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
exports.playableRefSchema = zod_1.z
    .object({
    mediaType: common_1.mediaTypeSchema,
    mediaId: common_1.objectIdSchema,
    episodeId: common_1.objectIdSchema.optional(),
})
    .refine((v) => (v.mediaType === "tv" ? Boolean(v.episodeId) : true), {
    message: "episodeId is required for TV playback",
    path: ["episodeId"],
});
exports.progressUpdateSchema = zod_1.z.object({
    mediaType: common_1.mediaTypeSchema,
    mediaId: common_1.objectIdSchema,
    episodeId: common_1.objectIdSchema.optional(),
    positionSeconds: zod_1.z.number().min(0),
    durationSeconds: zod_1.z.number().min(1),
});
exports.listKindSchema = zod_1.z.enum(["my_list", "favorites", "watch_later"]);
exports.listMutationSchema = zod_1.z.object({
    kind: exports.listKindSchema,
    mediaType: common_1.mediaTypeSchema,
    mediaId: common_1.objectIdSchema,
});
exports.reactionSchema = zod_1.z.object({
    mediaType: common_1.mediaTypeSchema,
    mediaId: common_1.objectIdSchema,
    reaction: zod_1.z.enum(["like", "dislike", "none"]),
});
exports.ratingSchema = zod_1.z.object({
    mediaType: common_1.mediaTypeSchema,
    mediaId: common_1.objectIdSchema,
    score: zod_1.z.number().min(0.5).max(5).multipleOf(0.5),
});
exports.createReviewSchema = zod_1.z.object({
    mediaType: common_1.mediaTypeSchema,
    mediaId: common_1.objectIdSchema,
    title: zod_1.z.string().trim().min(3, "Give your review a short title").max(120),
    body: zod_1.z
        .string()
        .trim()
        .min(10, "Reviews need at least 10 characters")
        .max(5000),
    score: zod_1.z.number().min(0.5).max(5).multipleOf(0.5),
    hasSpoilers: zod_1.z.boolean().default(false),
});
exports.updateReviewSchema = exports.createReviewSchema
    .omit({ mediaType: true, mediaId: true })
    .partial();
exports.reviewQuerySchema = common_1.paginationSchema.extend({
    sort: zod_1.z.enum(["newest", "oldest", "helpful", "score"]).default("helpful"),
});
exports.reportContentSchema = zod_1.z.object({
    targetType: zod_1.z.enum(["review", "user", "chat_message"]),
    targetId: common_1.objectIdSchema,
    reason: zod_1.z.enum(["spam", "harassment", "spoilers", "explicit", "other"]),
    details: zod_1.z.string().trim().max(1000).optional(),
});
//# sourceMappingURL=interactions.js.map