import type { CreateProfileInput, ProfileDTO, UpdateProfileInput } from '@shared';
import { http } from '../api-client';

export const profileApi = {
  list: () => http.get<{ profiles: ProfileDTO[]; avatars: string[] }>('/profiles'),

  create: (input: CreateProfileInput) => http.post<{ profile: ProfileDTO }>('/profiles', input),

  update: (id: string, input: UpdateProfileInput) =>
    http.patch<{ profile: ProfileDTO }>(`/profiles/${id}`, input),

  remove: (id: string) => http.delete<{ deleted: boolean }>(`/profiles/${id}`),

  setPin: (id: string, pin: string | null, currentPin?: string) =>
    http.put<{ profile: ProfileDTO }>(`/profiles/${id}/pin`, { pin, currentPin }),

  /** Unlocks a profile and returns the grant every profile-scoped call presents. */
  select: (profileId: string, pin?: string) =>
    http.post<{ profile: ProfileDTO; profileToken: string }>('/profiles/select', {
      profileId,
      ...(pin ? { pin } : {}),
    }),

  active: () => http.get<{ profile: ProfileDTO }>('/profiles/active'),

  clear: () => http.post<{ cleared: boolean }>('/profiles/clear'),
};
