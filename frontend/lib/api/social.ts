import type { TitleSummaryDTO, ProfileDTO } from '@shared';
import { http } from '../api-client';

export interface PublicProfile {
  profileId: string;
  handle: string;
  name: string;
  avatarKey: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean | null;
  isSelf: boolean;
  joinedAt: string;
}

export interface ActivityItem {
  id: string;
  kind: 'watched' | 'rated' | 'reviewed' | 'listed' | 'followed';
  actor: { profileId: string; name: string; handle: string | null; avatarKey: string };
  mediaTitle: string | null;
  mediaSlug: string | null;
  targetProfileName: string | null;
  score: number | null;
  createdAt: string;
}

export const socialApi = {
  profile: (handle: string) => http.get<PublicProfile>(`/social/profiles/${handle}`),

  sharedList: (handle: string) =>
    http.get<{ items: TitleSummaryDTO[] }>(`/social/profiles/${handle}/list`),

  setHandle: (handle: string | null, isPublic: boolean) =>
    http.put<{ profile: ProfileDTO }>('/social/handle', { handle, isPublic }),

  follow: (profileId: string) => http.post<{ following: boolean }>(`/social/follow/${profileId}`),

  unfollow: (profileId: string) =>
    http.delete<{ following: boolean }>(`/social/follow/${profileId}`),

  followers: () => http.get<{ items: PublicProfile[] }>('/social/followers'),
  following: () => http.get<{ items: PublicProfile[] }>('/social/following'),

  feed: () => http.get<{ items: ActivityItem[] }>('/social/feed'),
  discover: () => http.get<{ items: PublicProfile[] }>('/social/discover'),
};
