import type { NotificationDTO } from '@shared';
import { http } from '../api-client';

export const notificationApi = {
  list: () => http.get<{ items: NotificationDTO[]; unread: number }>('/notifications'),

  /** Omitting `ids` marks everything read. */
  markRead: (ids?: string[]) =>
    http.post<{ updated: number }>('/notifications/read', ids ? { ids } : {}),
};
