import { z } from 'zod';
import { GENRES, MATURITY_RATINGS, MEDIA_TYPES, PAGINATION } from '../constants';

/** A 24-character hex Mongo ObjectId, validated without importing mongoose on the client. */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

/** URL-safe slug: lowercase alphanumerics separated by single hyphens. */
export const slugSchema = z
  .string()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase hyphenated slug');

export const mediaTypeSchema = z.enum(MEDIA_TYPES);
export const genreSchema = z.enum(GENRES);
export const maturityRatingSchema = z.enum(MATURITY_RATINGS);

/**
 * Query-string pagination. Uses `coerce` because everything arriving on
 * `req.query` is a string, and we want the parsed output to be a real number.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/** Shape every paginated list endpoint returns, so the client can share one hook. */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** Success envelope. Every 2xx response body from the API looks like this. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Failure envelope. `details` carries flattened Zod issues on 422s. */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
