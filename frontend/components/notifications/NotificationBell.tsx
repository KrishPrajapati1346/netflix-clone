'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { SOCKET_EVENTS, type NotificationDTO } from '@shared';
import { notificationApi } from '@/lib/api/notifications';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useProfile } from '@/context/ProfileProvider';
import { cn, formatRelativeDate } from '@/lib/utils';

/**
 * Notification bell with live push.
 *
 * Fetched once on mount and then kept current by socket events, rather than
 * polled. Polling for a feature that is idle most of the time wastes a request
 * every interval on every open tab; the socket is already connected for watch
 * parties, so pushing costs nothing extra.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { activeProfile } = useProfile();
  const { socket } = useSocket();

  const { data } = useQuery({
    queryKey: ['notifications', activeProfile?.id],
    queryFn: notificationApi.list,
    enabled: Boolean(activeProfile),
  });

  useSocketEvent<NotificationDTO>(socket, SOCKET_EVENTS.notification, (notification) => {
    // Write straight into the cache so the badge updates without a refetch.
    queryClient.setQueryData<{ items: NotificationDTO[]; unread: number }>(
      ['notifications', activeProfile?.id],
      (current) => ({
        items: [notification, ...(current?.items ?? [])].slice(0, 30),
        unread: (current?.unread ?? 0) + 1,
      }),
    );
    toast(notification.title, { description: notification.body || undefined });
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => notificationApi.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open && unread > 0) markRead.mutate(undefined);
        }}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-fg-inverse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-panel border border-line bg-surface-overlay shadow-2xl">
            <div className="border-b border-line px-4 py-2.5">
              <p className="text-sm font-semibold">Notifications</p>
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-subtle">Nothing here yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((notification) => {
                  const content = (
                    <div
                      className={cn(
                        'px-4 py-3 transition-colors hover:bg-surface-raised',
                        !notification.readAt && 'bg-accent-soft/40',
                      )}
                    >
                      <p className="text-sm font-medium">{notification.title}</p>
                      {notification.body && (
                        <p className="mt-0.5 text-xs text-fg-muted">{notification.body}</p>
                      )}
                      <time className="mt-1 block text-[11px] text-fg-subtle" dateTime={notification.createdAt}>
                        {formatRelativeDate(notification.createdAt)}
                      </time>
                    </div>
                  );

                  return (
                    <li key={notification.id}>
                      {notification.href ? (
                        <Link href={notification.href} onClick={() => setOpen(false)}>
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
