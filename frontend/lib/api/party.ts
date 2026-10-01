import type { CreatePartyInput, PartyStateDTO } from '@shared';
import { http } from '../api-client';

export const partyApi = {
  create: (input: CreatePartyInput) =>
    http.post<{ party: PartyStateDTO }>('/parties', input),

  get: (code: string) => http.get<{ party: PartyStateDTO }>(`/parties/${code}`),

  end: (code: string) => http.post<{ ended: boolean }>(`/parties/${code}/end`),

  invite: (code: string, profileId: string) =>
    http.post<{ invited: boolean }>(`/parties/${code}/invite`, { profileId }),
};
