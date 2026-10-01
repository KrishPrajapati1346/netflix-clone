'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ProgressUpdateInput } from '@shared';
import { catalogApi, libraryApi } from '@/lib/api/catalog';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { FormAlert } from '@/components/ui/form-alert';
import { Button } from '@/components/ui/button';
import { VideoPlayer, type PlayerTitle } from './VideoPlayer';

/**
 * Loads what the player needs and persists progress back.
 *
 * Progress saves are fire-and-forget: a dropped heartbeat costs a few seconds
 * of resume accuracy, and surfacing a toast for it would interrupt the thing
 * the user is actually doing. Failures are still logged.
 */
export function WatchScreen({ kind, id }: { kind: 'movie' | 'episode'; id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeProfile } = useProfile();

  const movieQuery = useQuery({
    queryKey: ['watch', 'movie', id],
    queryFn: () => catalogApi.titleById('movie', id),
    enabled: kind === 'movie',
  });

  const episodeQuery = useQuery({
    queryKey: ['watch', 'episode', id],
    queryFn: () => catalogApi.episode(id),
    enabled: kind === 'episode',
  });

  const saveProgress = useMutation({
    mutationFn: (input: ProgressUpdateInput) => libraryApi.saveProgress(input),
    onError: (error) => console.warn('Progress save failed:', toApiError(error).message),
  });

  // React Query guarantees `mutate` is referentially stable, while the mutation
  // object itself is not. Depending on the object would give `handleProgress` a
  // new identity every time a save settled.
  const { mutate: persistProgress } = saveProgress;

  const isLoading = kind === 'movie' ? movieQuery.isLoading : episodeQuery.isLoading;
  const error = kind === 'movie' ? movieQuery.error : episodeQuery.error;

  const media: PlayerTitle | null = useMemo(() => {
    if (kind === 'movie' && movieQuery.data) {
      const title = movieQuery.data;
      return {
        title: title.title,
        subtitle: title.releaseYear ? String(title.releaseYear) : undefined,
        sources: title.sources,
        subtitles: title.subtitles,
        chapters: title.chapters,
        startAt: title.viewerState?.progress?.completed
          ? 0
          : (title.viewerState?.progress?.positionSeconds ?? 0),
      };
    }

    if (kind === 'episode' && episodeQuery.data) {
      const episode = episodeQuery.data;
      return {
        title: episode.title,
        subtitle: `${episode.showTitle} · S${episode.seasonNumber} E${episode.episodeNumber}`,
        sources: episode.sources,
        subtitles: episode.subtitles,
        chapters: episode.chapters,
        startAt: episode.progress?.completed ? 0 : (episode.progress?.positionSeconds ?? 0),
      };
    }

    return null;
  }, [kind, movieQuery.data, episodeQuery.data]);

  const handleProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      if (!activeProfile || durationSeconds <= 0) return;

      if (kind === 'movie' && movieQuery.data) {
        persistProgress({
          mediaType: 'movie',
          mediaId: movieQuery.data.id,
          positionSeconds,
          durationSeconds,
        });
      } else if (kind === 'episode' && episodeQuery.data) {
        persistProgress({
          mediaType: 'tv',
          mediaId: episodeQuery.data.showId,
          episodeId: episodeQuery.data.id,
          positionSeconds,
          durationSeconds,
        });
      }
    },
    [activeProfile, kind, movieQuery.data, episodeQuery.data, persistProgress],
  );

  const handleEnded = useCallback(() => {
    // Continue Watching and the home feed both changed; drop their caches so
    // returning to the home page reflects what was just finished.
    void queryClient.invalidateQueries({ queryKey: ['home'] });
    void queryClient.invalidateQueries({ queryKey: ['continue'] });
  }, [queryClient]);

  if (isLoading) return <FullPageSpinner label="Loading playback" />;

  if (error || !media) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <FormAlert tone="danger">
          {error ? toApiError(error).message : 'That title cannot be played right now.'}
        </FormAlert>
        <Button onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  if (media.sources.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <FormAlert tone="info">
          This title has no playable source attached yet. An admin can add one from the catalog
          editor.
        </FormAlert>
        <Button onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center bg-black">
      <VideoPlayer media={media} onProgress={handleProgress} onEnded={handleEnded} />
    </div>
  );
}
