import type { Genre, LanguageCode, MaturityRating, MediaType, UserRole } from "../constants";
import type { Chapter, CastMember, SubtitleTrack, VideoSource } from "../schemas/media";
import type { NotificationPreferences, PlaybackPreferences } from "../schemas/profile";
import type { ListKind } from "../schemas/interactions";
export interface UserDTO {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
    avatarUrl: string | null;
    authProviders: Array<"local" | "google" | "github">;
    createdAt: string;
}
export interface ProfileDTO {
    id: string;
    name: string;
    avatarKey: string;
    avatarUrl: string | null;
    isKids: boolean;
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
    sources: VideoSource[];
    subtitles: SubtitleTrack[];
    chapters: Chapter[];
    seasons: SeasonSummaryDTO[];
    showStatus: "returning" | "ended" | "canceled" | "in_production" | null;
    viewerState: ViewerTitleStateDTO | null;
}
export interface ViewerTitleStateDTO {
    inLists: ListKind[];
    reaction: "like" | "dislike" | "none";
    rating: number | null;
    progress: ProgressDTO | null;
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
    percent: number;
    completed: boolean;
    updatedAt: string;
}
export interface ContinueWatchingItemDTO {
    title: TitleSummaryDTO;
    episode: EpisodeSummaryDTO | null;
    progress: ProgressDTO;
}
export interface CatalogRowDTO {
    key: string;
    title: string;
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
    body: string;
    score: number;
    hasSpoilers: boolean;
    helpfulCount: number;
    viewerFoundHelpful: boolean;
    isOwn: boolean;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=index.d.ts.map