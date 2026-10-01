import type {
  CreateReviewInput,
  MediaType,
  Paginated,
  RatingInput,
  ReviewDTO,
  ReviewQuery,
  UpdateReviewInput,
} from '@shared';
import { http } from '../api-client';

export const reviewApi = {
  setRating: (input: RatingInput) =>
    http.put<{ score: number; averageScore: number; ratingCount: number }>(
      '/reviews/ratings',
      input,
    ),

  clearRating: (mediaType: MediaType, mediaId: string) =>
    http.delete<{ cleared: boolean }>(`/reviews/ratings/${mediaType}/${mediaId}`),

  list: (mediaId: string, query: Partial<ReviewQuery> = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.sort) params.set('sort', query.sort);
    return http.get<Paginated<ReviewDTO>>(`/reviews/titles/${mediaId}?${params.toString()}`);
  },

  create: (input: CreateReviewInput) => http.post<{ review: ReviewDTO }>('/reviews', input),

  update: (id: string, input: UpdateReviewInput) =>
    http.patch<{ review: ReviewDTO }>(`/reviews/${id}`, input),

  remove: (id: string) => http.delete<{ deleted: boolean }>(`/reviews/${id}`),

  toggleHelpful: (id: string) =>
    http.post<{ helpful: boolean; helpfulCount: number }>(`/reviews/${id}/helpful`),
};
