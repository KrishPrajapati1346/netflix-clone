import { z } from "zod";
export declare const playableRefSchema: z.ZodObject<{
    mediaType: z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>;
    mediaId: z.ZodString;
    episodeId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PlayableRef = z.infer<typeof playableRefSchema>;
export declare const progressUpdateSchema: z.ZodObject<{
    mediaType: z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>;
    mediaId: z.ZodString;
    episodeId: z.ZodOptional<z.ZodString>;
    positionSeconds: z.ZodNumber;
    durationSeconds: z.ZodNumber;
}, z.core.$strip>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
export declare const listKindSchema: z.ZodEnum<{
    my_list: "my_list";
    favorites: "favorites";
    watch_later: "watch_later";
}>;
export type ListKind = z.infer<typeof listKindSchema>;
export declare const listMutationSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        my_list: "my_list";
        favorites: "favorites";
        watch_later: "watch_later";
    }>;
    mediaType: z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>;
    mediaId: z.ZodString;
}, z.core.$strip>;
export type ListMutationInput = z.infer<typeof listMutationSchema>;
export declare const reactionSchema: z.ZodObject<{
    mediaType: z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>;
    mediaId: z.ZodString;
    reaction: z.ZodEnum<{
        like: "like";
        dislike: "dislike";
        none: "none";
    }>;
}, z.core.$strip>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export declare const ratingSchema: z.ZodObject<{
    mediaType: z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>;
    mediaId: z.ZodString;
    score: z.ZodNumber;
}, z.core.$strip>;
export type RatingInput = z.infer<typeof ratingSchema>;
export declare const createReviewSchema: z.ZodObject<{
    mediaType: z.ZodEnum<{
        movie: "movie";
        tv: "tv";
    }>;
    mediaId: z.ZodString;
    title: z.ZodString;
    body: z.ZodString;
    score: z.ZodNumber;
    hasSpoilers: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export declare const updateReviewSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    score: z.ZodOptional<z.ZodNumber>;
    body: z.ZodOptional<z.ZodString>;
    hasSpoilers: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export declare const reviewQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    sort: z.ZodDefault<z.ZodEnum<{
        newest: "newest";
        score: "score";
        oldest: "oldest";
        helpful: "helpful";
    }>>;
}, z.core.$strip>;
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
export declare const reportContentSchema: z.ZodObject<{
    targetType: z.ZodEnum<{
        user: "user";
        review: "review";
        chat_message: "chat_message";
    }>;
    targetId: z.ZodString;
    reason: z.ZodEnum<{
        spam: "spam";
        harassment: "harassment";
        spoilers: "spoilers";
        explicit: "explicit";
        other: "other";
    }>;
    details: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ReportContentInput = z.infer<typeof reportContentSchema>;
//# sourceMappingURL=interactions.d.ts.map