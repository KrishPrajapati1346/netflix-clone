import type {
  CreateEpisodeInput,
  CreateMovieInput,
  CreateSeasonInput,
  CreateShowInput,
  MediaType,
  Paginated,
  UpdateMovieInput,
  UpdateShowInput,
  UserRole,
} from '@shared';
import { http } from '../api-client';

export interface DailyPoint {
  date: string;
  value: number;
}

export interface AnalyticsSummary {
  totals: {
    users: number;
    profiles: number;
    movies: number;
    shows: number;
    episodes: number;
    reviews: number;
    ratings: number;
    watchHours: number;
  };
  activity: { dau: number; mau: number; stickiness: number };
  userGrowth: DailyPoint[];
  watchHours: DailyPoint[];
  topGenres: Array<{ genre: string; watchCount: number }>;
  topTitles: Array<{
    title: string;
    slug: string;
    mediaType: string;
    watchCount: number;
    averageScore: number;
  }>;
  ratingDistribution: Array<{ score: number; count: number }>;
}

export interface AdminCatalogRow {
  id: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  isPublished: boolean;
  isFeatured: boolean;
  maturityRating: string;
  genres: string[];
  averageScore: number;
  popularity: number;
  hasSources: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  profileCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ModerationReview {
  id: string;
  title: string;
  body: string;
  score: number;
  isHidden: boolean;
  authorName: string;
  mediaId: string;
  createdAt: string;
}

export const adminApi = {
  analytics: (days = 30) => http.get<AnalyticsSummary>(`/admin/analytics?days=${days}`),

  catalog: (page = 1, q = '') =>
    http.get<Paginated<AdminCatalogRow>>(
      `/admin/catalog?page=${page}&limit=25${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    ),

  createMovie: (input: CreateMovieInput) => http.post<{ movie: unknown }>('/admin/movies', input),
  updateMovie: (id: string, input: UpdateMovieInput) =>
    http.patch<{ movie: unknown }>(`/admin/movies/${id}`, input),
  deleteMovie: (id: string) => http.delete<{ deleted: boolean }>(`/admin/movies/${id}`),

  createShow: (input: CreateShowInput) => http.post<{ show: unknown }>('/admin/shows', input),
  updateShow: (id: string, input: UpdateShowInput) =>
    http.patch<{ show: unknown }>(`/admin/shows/${id}`, input),
  deleteShow: (id: string) => http.delete<{ deleted: boolean }>(`/admin/shows/${id}`),

  createSeason: (input: CreateSeasonInput) => http.post<{ season: unknown }>('/admin/seasons', input),
  createEpisode: (input: CreateEpisodeInput) =>
    http.post<{ episode: unknown }>('/admin/episodes', input),

  users: (page = 1, q = '') =>
    http.get<Paginated<AdminUser>>(
      `/admin/users?page=${page}&limit=25${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    ),

  setRole: (id: string, role: UserRole) =>
    http.put<{ updated: boolean }>(`/admin/users/${id}/role`, { role }),

  moderationQueue: () => http.get<{ items: ModerationReview[] }>('/admin/moderation/reviews'),

  setReviewHidden: (id: string, isHidden: boolean) =>
    http.put<{ updated: boolean }>(`/admin/moderation/reviews/${id}`, { isHidden }),
};
