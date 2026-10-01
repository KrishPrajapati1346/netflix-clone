import type {
  CatalogQuery,
  ContinueWatchingItemDTO,
  EpisodeDetailDTO,
  EpisodeSummaryDTO,
  HomeFeedDTO,
  ListKind,
  MediaType,
  Paginated,
  ProgressDTO,
  ProgressUpdateInput,
  TitleDetailDTO,
  TitleSummaryDTO,
} from '@shared';
import { API_BASE_URL, API_PREFIX, http } from '../api-client';

/** Extra fields the episode endpoint adds so the player can render breadcrumbs. */
export interface EpisodePlaybackDTO extends EpisodeDetailDTO {
  showTitle: string;
  showSlug: string;
}

/**
 * Turns a catalog query into a query string.
 *
 * Array filters are repeated (`?genre=Action&genre=Drama`) rather than joined,
 * and the shared schema accepts either — but repeating is what a plain HTML
 * form would produce, so the browse page's filter form works without JavaScript
 * rewriting it.
 */
export function toQueryString(query: Partial<CatalogQuery>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, String(entry));
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export const catalogApi = {
  browse: (query: Partial<CatalogQuery>) =>
    http.get<Paginated<TitleSummaryDTO>>(`/catalog/browse?${toQueryString(query)}`),

  home: () => http.get<HomeFeedDTO>('/catalog/home'),

  title: (slug: string) => http.get<TitleDetailDTO>(`/catalog/titles/${encodeURIComponent(slug)}`),

  /** Detail by id — what rows and heroes carry, versus the slug in the URL. */
  titleById: (mediaType: MediaType, id: string) =>
    http.get<TitleDetailDTO>(`/catalog/titles/by-id/${mediaType}/${id}`),

  similar: (slug: string) =>
    http.get<{ items: TitleSummaryDTO[] }>(`/catalog/titles/${encodeURIComponent(slug)}/similar`),

  episodes: (showId: string, season?: number) =>
    http.get<{ items: EpisodeSummaryDTO[] }>(
      `/catalog/shows/${showId}/episodes${season !== undefined ? `?season=${season}` : ''}`,
    ),

  episode: (episodeId: string) => http.get<EpisodePlaybackDTO>(`/catalog/episodes/${episodeId}`),

  filters: () =>
    http.get<{
      genres: string[];
      languages: Array<{ code: string; label: string }>;
      ratings: string[];
      sorts: string[];
    }>('/catalog/filters'),
};

export const libraryApi = {
  saveProgress: (input: ProgressUpdateInput) => http.post<ProgressDTO>('/library/progress', input),

  continueWatching: () =>
    http.get<{ items: ContinueWatchingItemDTO[] }>('/library/progress/continue'),

  history: (page = 1, limit = 24) =>
    http.get<Paginated<ProgressDTO>>(`/library/progress/history?page=${page}&limit=${limit}`),

  removeFromHistory: (mediaId: string) =>
    http.delete<{ removed: number }>(`/library/progress/${mediaId}`),

  getList: (kind: ListKind) =>
    http.get<{ kind: ListKind; items: TitleSummaryDTO[] }>(`/library/lists/${kind}`),

  addToList: (kind: ListKind, mediaType: MediaType, mediaId: string) =>
    http.post<{ added: boolean }>('/library/lists', { kind, mediaType, mediaId }),

  removeFromList: (kind: ListKind, mediaType: MediaType, mediaId: string) =>
    http.delete<{ removed: boolean }>('/library/lists', { data: { kind, mediaType, mediaId } }),

  setReaction: (mediaType: MediaType, mediaId: string, reaction: 'like' | 'dislike' | 'none') =>
    http.post<{ reaction: string }>('/library/reactions', { mediaType, mediaId, reaction }),
};

/**
 * Resolves artwork for a title.
 *
 * Falls back to the API's generated-art route when a title has no stored
 * poster, which is the normal case on a fixture-seeded catalog. Keeping this in
 * one function means no component has to know the fallback exists.
 */
export function artworkUrl(
  title: { slug: string; posterUrl?: string | null; backdropUrl?: string | null },
  shape: 'poster' | 'backdrop',
): string {
  const stored = shape === 'poster' ? title.posterUrl : title.backdropUrl;
  if (stored) return stored;
  return `${API_BASE_URL}${API_PREFIX}/artwork/${encodeURIComponent(title.slug)}/${shape}.svg`;
}
