'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Copy, LogOut, Send, Users } from 'lucide-react';
import {
  REACTION_EMOJI,
  SOCKET_EVENTS,
  type PartyMemberDTO,
  type PartyMessageDTO,
  type PartyStateDTO,
  type PartySyncPayload,
} from '@shared';
import { catalogApi } from '@/lib/api/catalog';
import { partyApi } from '@/lib/api/party';
import { toApiError } from '@/lib/api-client';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useProfile } from '@/context/ProfileProvider';
import { VideoPlayer, type PlayerTitle } from '@/components/player/VideoPlayer';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { cn, formatTimecode } from '@/lib/utils';

/**
 * A synchronised viewing room.
 *
 * The hard part is not the socket — it is deciding *when* to obey a sync. Two
 * rules keep the room stable:
 *
 *  1. A remote seek is applied only if this player is more than 1.5s out.
 *     Applying every sync exactly would fight normal playback drift and produce
 *     visible micro-stutter.
 *  2. While applying a remote sync, this client suppresses its own outbound
 *     control events — otherwise A seeks, B obeys and echoes, A obeys the echo,
 *     and the room oscillates forever.
 */
export function WatchPartyRoom({ code }: { code: string }) {
  const router = useRouter();
  const { activeProfile } = useProfile();
  const { socket, isConnected } = useSocket();

  const [state, setState] = useState<PartyStateDTO | null>(null);
  const [members, setMembers] = useState<PartyMemberDTO[]>([]);
  const [messages, setMessages] = useState<PartyMessageDTO[]>([]);
  const [draft, setDraft] = useState('');
  const [socketError, setSocketError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** True while a remote sync is being applied, to suppress the echo. */
  const applyingRemote = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: partyInfo, isLoading, isError, error } = useQuery({
    queryKey: ['party', code],
    queryFn: () => partyApi.get(code),
    retry: false,
  });

  // Playable sources are fetched separately: the party record identifies what
  // is being watched, not how to play it.
  const { data: media } = useQuery({
    queryKey: ['party-media', partyInfo?.party.mediaId, partyInfo?.party.episodeId],
    queryFn: async (): Promise<PlayerTitle | null> => {
      const info = partyInfo!.party;
      if (info.mediaType === 'tv' && info.episodeId) {
        const episode = await catalogApi.episode(info.episodeId);
        return {
          title: episode.title,
          subtitle: `${episode.showTitle} · S${episode.seasonNumber} E${episode.episodeNumber}`,
          sources: episode.sources,
          subtitles: episode.subtitles,
          chapters: episode.chapters,
          startAt: info.positionSeconds,
        };
      }
      const title = await catalogApi.titleById('movie', info.mediaId);
      return {
        title: title.title,
        subtitle: title.releaseYear ? String(title.releaseYear) : undefined,
        sources: title.sources,
        subtitles: title.subtitles,
        chapters: title.chapters,
        startAt: info.positionSeconds,
      };
    },
    enabled: Boolean(partyInfo),
  });

  // Join once connected.
  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.emit(SOCKET_EVENTS.partyJoin, { code });

    return () => {
      socket.emit(SOCKET_EVENTS.partyLeave, { code });
    };
  }, [socket, isConnected, code]);

  useSocketEvent<{ state: PartyStateDTO; messages: PartyMessageDTO[] }>(
    socket,
    SOCKET_EVENTS.partyState,
    (payload) => {
      setState(payload.state);
      setMembers(payload.state.members);
      setMessages(payload.messages);
    },
  );

  useSocketEvent<{ members: PartyMemberDTO[] }>(socket, SOCKET_EVENTS.partyMembers, (payload) =>
    setMembers(payload.members),
  );

  useSocketEvent<PartyMessageDTO>(socket, SOCKET_EVENTS.partyMessage, (message) =>
    setMessages((current) => [...current, message]),
  );

  useSocketEvent<{ message: string }>(socket, SOCKET_EVENTS.partyError, (payload) =>
    setSocketError(payload.message),
  );

  useSocketEvent<PartySyncPayload>(socket, SOCKET_EVENTS.partySync, (payload) => {
    const video = videoRef.current;
    if (!video || payload.byProfileId === activeProfile?.id) return;

    /**
     * Compensate for the trip.
     *
     * The command left the server at `atServerTime`; whatever has elapsed since
     * has also elapsed for everyone still playing. Seeking to the raw position
     * would place this client permanently behind by the network latency.
     */
    const latency = Math.max(0, (Date.now() - new Date(payload.atServerTime).getTime()) / 1000);
    const target =
      payload.action === 'pause' ? payload.positionSeconds : payload.positionSeconds + latency;

    applyingRemote.current = true;

    if (Math.abs(video.currentTime - target) > 1.5) {
      video.currentTime = target;
    }

    if (payload.action === 'pause' && !video.paused) video.pause();
    if (payload.action !== 'pause' && video.paused) void video.play().catch(() => undefined);

    // Release on the next tick, after the resulting play/pause events fire.
    setTimeout(() => {
      applyingRemote.current = false;
    }, 250);
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /** Broadcast a local control action, unless it came from a remote sync. */
  const broadcast = useCallback(
    (action: 'play' | 'pause' | 'seek', positionSeconds: number) => {
      if (applyingRemote.current || !socket) return;
      socket.emit(SOCKET_EVENTS.partyControl, { code, action, positionSeconds });
    },
    [socket, code],
  );

  // Attach control listeners to the underlying media element.
  useEffect(() => {
    const video = document.querySelector('video');
    if (!video) return;
    videoRef.current = video;

    const onPlay = () => broadcast('play', video.currentTime);
    const onPause = () => broadcast('pause', video.currentTime);
    const onSeeked = () => broadcast('seek', video.currentTime);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [broadcast, media]);

  const sendChat = () => {
    if (!socket || draft.trim().length === 0) return;
    socket.emit(SOCKET_EVENTS.partyChat, {
      code,
      body: draft.trim(),
      atSeconds: videoRef.current?.currentTime ?? 0,
    });
    setDraft('');
  };

  const sendReaction = (emoji: string) => {
    socket?.emit(SOCKET_EVENTS.partyReaction, {
      code,
      emoji,
      atSeconds: videoRef.current?.currentTime ?? 0,
    });
  };

  if (isLoading) return <FullPageSpinner label="Joining the party" />;

  if (isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <FormAlert tone="danger">{toApiError(error).message}</FormAlert>
        <Button onClick={() => router.push('/browse')}>Back to browse</Button>
      </div>
    );
  }

  const canControl = !state?.hostControlsOnly || state?.isHost;

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[1fr_22rem] lg:grid-rows-1">
      <div className="flex flex-col bg-black">
        {media && media.sources.length > 0 ? (
          <VideoPlayer media={media} />
        ) : (
          <div className="flex aspect-video items-center justify-center text-fg-muted">
            Loading playback…
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 bg-canvas px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{partyInfo?.party.title}</p>
            {partyInfo?.party.subtitle && (
              <p className="truncate text-xs text-fg-subtle">{partyInfo.party.subtitle}</p>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(code);
                toast.success('Party code copied');
              }}
              className="flex items-center gap-2 rounded-control border border-line px-3 py-1.5 font-mono text-sm tracking-[0.2em]"
            >
              {code}
              <Copy className="size-3.5" aria-hidden="true" />
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                socket?.emit(SOCKET_EVENTS.partyLeave, { code });
                router.push('/browse');
              }}
            >
              <LogOut aria-hidden="true" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col border-line bg-surface lg:border-l">
        <header className="border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-fg-subtle" aria-hidden="true" />
            <h2 className="text-sm font-semibold">
              {members.length} watching
              {!isConnected && <span className="ml-2 text-xs text-warning">reconnecting…</span>}
            </h2>
          </div>

          <ul className="mt-2 flex flex-wrap gap-1.5">
            {members.map((member) => (
              <li
                key={member.profileId}
                className="flex items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 text-xs"
              >
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                {member.name}
                {member.isHost && <span className="text-accent">host</span>}
              </li>
            ))}
          </ul>

          {!canControl && (
            <p className="mt-2 text-xs text-fg-subtle">
              The host controls playback. Your player follows theirs.
            </p>
          )}
        </header>

        {socketError && (
          <div className="p-3">
            <FormAlert tone="danger">{socketError}</FormAlert>
          </div>
        )}

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((message) => (
            <li key={message.id}>
              {message.kind === 'system' ? (
                <p className="text-center text-xs text-fg-subtle">{message.body}</p>
              ) : message.kind === 'reaction' ? (
                <p className="text-sm">
                  <span className="text-fg-subtle">{message.profileName}</span>{' '}
                  <span className="text-xl align-middle">{message.body}</span>{' '}
                  <span className="text-[10px] text-fg-subtle">
                    at {formatTimecode(message.atSeconds)}
                  </span>
                </p>
              ) : (
                <p className="text-sm">
                  <span
                    className={cn(
                      'font-semibold',
                      message.profileId === activeProfile?.id ? 'text-accent' : 'text-fg',
                    )}
                  >
                    {message.profileName}
                  </span>
                  <span className="ml-2 text-fg-muted">{message.body}</span>
                </p>
              )}
            </li>
          ))}
          <div ref={chatEndRef} />
        </ul>

        <div className="border-t border-line p-3">
          <div className="mb-2 flex flex-wrap gap-1">
            {REACTION_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                aria-label={`React with ${emoji}`}
                className="rounded-control px-2 py-1 text-lg transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendChat();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Say something…"
              maxLength={500}
              aria-label="Chat message"
              className="h-10 flex-1 rounded-control border border-line bg-surface-raised px-3 text-sm"
            />
            <Button type="submit" size="sm" disabled={draft.trim().length === 0}>
              <Send aria-hidden="true" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </aside>
    </div>
  );
}
