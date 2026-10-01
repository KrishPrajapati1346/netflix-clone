import { z } from 'zod';
import { mediaTypeSchema, objectIdSchema, paginationSchema } from './common';

/**
 * Identifies exactly one playable thing: a movie, or one episode of a show.
 * Used by progress, ratings, lists and watch parties alike.
 */
export const playableRefSchema = z
  .object({
    mediaType: mediaTypeSchema,
    mediaId: objectIdSchema,
    episodeId: objectIdSchema.optional(),
  })
  .refine((v) => (v.mediaType === 'tv' ? Boolean(v.episodeId) : true), {
    message: 'episodeId is required for TV playback',
    path: ['episodeId'],
  });
export type PlayableRef = z.infer<typeof playableRefSchema>;

export const progressUpdateSchema = z.object({
  mediaType: mediaTypeSchema,
  mediaId: objectIdSchema,
  episodeId: objectIdSchema.optional(),
  positionSeconds: z.number().min(0),
  durationSeconds: z.number().min(1),
});
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;

export const listKindSchema = z.enum(['my_list', 'favorites', 'watch_later']);
export type ListKind = z.infer<typeof listKindSchema>;

export const listMutationSchema = z.object({
  kind: listKindSchema,
  mediaType: mediaTypeSchema,
  mediaId: objectIdSchema,
});
export type ListMutationInput = z.infer<typeof listMutationSchema>;

/** Thumbs up / down / cleared — the coarse signal that feeds recommendations. */
export const reactionSchema = z.object({
  mediaType: mediaTypeSchema,
  mediaId: objectIdSchema,
  reaction: z.enum(['like', 'dislike', 'none']),
});
export type ReactionInput = z.infer<typeof reactionSchema>;

export const ratingSchema = z.object({
  mediaType: mediaTypeSchema,
  mediaId: objectIdSchema,
  score: z.number().min(0.5).max(5).multipleOf(0.5),
});
export type RatingInput = z.infer<typeof ratingSchema>;

export const createReviewSchema = z.object({
  mediaType: mediaTypeSchema,
  mediaId: objectIdSchema,
  title: z.string().trim().min(3, 'Give your review a short title').max(120),
  body: z.string().trim().min(10, 'Reviews need at least 10 characters').max(5000),
  score: z.number().min(0.5).max(5).multipleOf(0.5),
  hasSpoilers: z.boolean().default(false),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = createReviewSchema
  .omit({ mediaType: true, mediaId: true })
  .partial();
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const reviewQuerySchema = paginationSchema.extend({
  sort: z.enum(['newest', 'oldest', 'helpful', 'score']).default('helpful'),
});
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;

export const reportContentSchema = z.object({
  targetType: z.enum(['review', 'user', 'chat_message']),
  targetId: objectIdSchema,
  reason: z.enum(['spam', 'harassment', 'spoilers', 'explicit', 'other']),
  details: z.string().trim().max(1000).optional(),
});
export type ReportContentInput = z.infer<typeof reportContentSchema>;
