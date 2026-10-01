import type { Genre, LanguageCode, MaturityRating, MediaType, UserRole } from '../constants';
import type { Chapter, CastMember, SubtitleTrack, VideoSource } from '../schemas/media';
import type { NotificationPreferences, PlaybackPreferences } from '../schemas/profile';
import type { ListKind } from '../schemas/interactions';

/**
 * Data-transfer shapes returned by the API.
 *
 * These are hand-written rather than inferred from Mongoose because the wire
 * format is a deliberate contract: ids are strings, dates are ISO strings, and
 * secrets (password hashes, PIN hashes, refresh tokens) are structurally absent
 * so they cannot leak by accident.
 */

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl: string | null;
  authProviders: Array<'local' | 'google' | 'github'>;
  createdAt: string;
}

export interface ProfileDTO {
  id: string;
  name: string;
  avatarKey: string;
  avatarUrl: string | null;
  isKids: boolean;
  /** Public handle without the `@`, or null when the profile is private. */
  handle: string | null;
  isPublic: boolean;
  hasPin: boolean;
  language: LanguageCode;
  maturityLimit: MaturityRating;
  playback: PlaybackPreferences;
  notifications: NotificationPreferences;
  createdAt: string;
}

export interface AuthSessionDTO {
  user: UserDTO;
  accessToken: string;
  /** Seconds until `accessToken` expires; the client refreshes shortly before. */
  expiresIn: number;
}

export interface TitleSummaryDTO {
  id: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  overview: string;
  genres: Genre[];
  language: LanguageCode;
  maturityRating: MaturityRating;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  averageScore: number;
  ratingCount: number;
  popularity: number;
  /** 0–100 personalised affinity, or null when the viewer is anonymous. */
  matchScore: number | null;
}

export interface TitleDetailDTO extends TitleSummaryDTO {
  tagline: string | null;
  trailerUrl: string | null;
  cast: CastMember[];
  directors: string[];
  keywords: string[];
  isFeatured: boolean;
  releaseDate: string | null;
  /** Movies only. */
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
  chapters: Chapter[];
  /** TV only. */
  seasons: SeasonSummaryDTO[];
  showStatus: 'returning' | 'ended' | 'canceled' | 'in_production' | null;
  /** Viewer-specific state, null when anonymous. */
  viewerState: ViewerTitleStateDTO | null;
}

export interface ViewerTitleStateDTO {
  inLists: ListKind[];
  reaction: 'like' | 'dislike' | 'none';
  rating: number | null;
  progress: ProgressDTO | null;
  /** For shows: the episode Continue Watching would resume or start next. */
  nextEpisode: EpisodeSummaryDTO | null;
}

export interface SeasonSummaryDTO {
  id: string;
  seasonNumber: number;
  name: string;
  overview: string;
  posterUrl: string | null;
  airDate: string | null;
  episodeCount: number;
}

export interface EpisodeSummaryDTO {
  id: string;
  showId: string;
  seasonId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string;
  stillUrl: string | null;
  runtimeMinutes: number;
  airDate: string | null;
  progress: ProgressDTO | null;
}

export interface EpisodeDetailDTO extends EpisodeSummaryDTO {
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
  chapters: Chapter[];
}

export interface ProgressDTO {
  mediaType: MediaType;
  mediaId: string;
  episodeId: string | null;
  positionSeconds: number;
  durationSeconds: number;
  /** 0–1. */
  percent: number;
  completed: boolean;
  updatedAt: string;
}

export interface ContinueWatchingItemDTO {
  title: TitleSummaryDTO;
  episode: EpisodeSummaryDTO | null;
  progress: ProgressDTO;
}

/** One horizontal carousel on the home page. */
export interface CatalogRowDTO {
  key: string;
  title: string;
  /** Why this row exists — surfaced in the UI so recommendations are explainable. */
  reason: string | null;
  items: TitleSummaryDTO[];
}

export interface HomeFeedDTO {
  hero: TitleDetailDTO | null;
  rows: CatalogRowDTO[];
}

export interface ReviewDTO {
  id: string;
  mediaType: MediaType;
  mediaId: string;
  author: {
    id: string;
    profileId: string;
    name: string;
    avatarUrl: string | null;
  };
  title: string;
  /** Sanitised HTML — safe to render, already stripped of scripts server-side. */
  body: string;
  score: number;
  hasSpoilers: boolean;
  helpfulCount: number;
  viewerFoundHelpful: boolean;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
}
