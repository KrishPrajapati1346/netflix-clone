import { z } from "zod";
export declare const objectIdSchema: z.ZodString;
export declare const slugSchema: z.ZodString;
export declare const mediaTypeSchema: z.ZodEnum<{
    movie: "movie";
    tv: "tv";
}>;
export declare const genreSchema: z.ZodEnum<{
    Action: "Action";
    Adventure: "Adventure";
    Animation: "Animation";
    Comedy: "Comedy";
    Crime: "Crime";
    Documentary: "Documentary";
    Drama: "Drama";
    Family: "Family";
    Fantasy: "Fantasy";
    History: "History";
    Horror: "Horror";
    Music: "Music";
    Mystery: "Mystery";
    Romance: "Romance";
    "Science Fiction": "Science Fiction";
    Thriller: "Thriller";
    War: "War";
    Western: "Western";
}>;
export declare const maturityRatingSchema: z.ZodEnum<{
    G: "G";
    PG: "PG";
    "PG-13": "PG-13";
    R: "R";
    "NC-17": "NC-17";
    "TV-Y": "TV-Y";
    "TV-G": "TV-G";
    "TV-PG": "TV-PG";
    "TV-14": "TV-14";
    "TV-MA": "TV-MA";
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export declare const sortOrderSchema: z.ZodDefault<z.ZodEnum<{
    asc: "asc";
    desc: "desc";
}>>;
export interface Paginated<T> {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}
export interface ApiSuccess<T> {
    success: true;
    data: T;
}
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, string[]>;
    };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
//# sourceMappingURL=common.d.ts.map