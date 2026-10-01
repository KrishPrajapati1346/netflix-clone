import type { Paginated, SearchQuery, TitleSummaryDTO } from '@shared';
import { http } from '../api-client';
import { toQueryString } from './catalog';

export interface SearchResult extends Paginated<TitleSummaryDTO> {
  /** Which engine answered — Atlas Search, or the local text-index fallback. */
  engine: 'atlas' | 'local';
  /** True when exact matching found nothing and typo tolerance was used. */
  didYouMean: boolean;
}

export interface Suggestion {
  title: string;
  slug: string;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  releaseYear: number | null;
}

export const searchApi = {
  search: (query: Partial<SearchQuery> & { q: string }) =>
    http.get<SearchResult>(`/search?${toQueryString(query)}`),

  autocomplete: (q: string, limit = 8) =>
    http.get<{ suggestions: Suggestion[] }>(
      `/search/autocomplete?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  trending: () => http.get<{ terms: string[] }>('/search/trending'),

  history: () => http.get<{ terms: string[] }>('/search/history'),

  clearHistory: () => http.delete<{ cleared: number }>('/search/history'),
};
