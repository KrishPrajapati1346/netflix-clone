'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Play } from 'lucide-react';
import type { SeasonSummaryDTO } from '@shared';
import { catalogApi } from '@/lib/api/catalog';
import { useProfile } from '@/context/ProfileProvider';
import { formatRuntime } from '@/lib/utils';

/**
 * Season selector plus the episode list for the chosen season.
 *
 * Progress comes back attached to each episode from one bulk query on the
 * server, so the resume bars render without a request per row.
 */
export function EpisodeList({
  showId,
  seasons,
  initialSeason,
}: {
  showId: string;
  seasons: SeasonSummaryDTO[];
  initialSeason: number;
}) {
  const { activeProfile } = useProfile();
  const [seasonNumber, setSeasonNumber] = useState(initialSeason);

  const { data, isLoading } = useQuery({
    queryKey: ['episodes', showId, seasonNumber, activeProfile?.id],
    queryFn: () => catalogApi.episodes(showId, seasonNumber),
  });

  const episodes = data?.items ?? [];

  return (
    <section aria-labelledby="episodes-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="episodes-heading" className="text-lg font-bold tracking-tight">
          Episodes
        </h2>

        {seasons.length > 1 && (
          <label className="text-sm">
            <span className="sr-only">Season</span>
            <select
              value={seasonNumber}
              onChange={(event) => setSeasonNumber(Number(event.target.value))}
              className="h-10 rounded-control border border-line bg-surface px-3 text-sm"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.seasonNumber}>
                  {season.name} ({season.episodeCount} episodes)
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isLoading ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((index) => (
            <li key={index} className="skeleton h-28 rounded-panel" aria-hidden="true" />
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-line">
          {episodes.map((episode) => {
            const percent = episode.progress ? Math.round(episode.progress.percent * 100) : 0;

            return (
              <li key={episode.id}>
                <Link
                  href={`/watch/episode/${episode.id}`}
                  className="group flex gap-4 rounded-panel p-3 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="w-6 shrink-0 pt-6 text-center text-lg font-semibold text-fg-subtle">
                    {episode.episodeNumber}
                  </span>

                  <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-control bg-surface-raised sm:w-44">
                    {episode.stillUrl ? (
                      <Image
                        src={episode.stillUrl}
                        alt=""
                        fill
                        sizes="176px"
                        className="object-cover"
                      />
                    ) : (
                      /*
                        Episode stills are per-episode artwork the generated
                        route does not cover (it is addressed by title slug).
                        A tinted panel keyed to the episode number is honest
                        about that and stays visually consistent down the list.
                      */
                      <span
                        className="absolute inset-0 bg-gradient-to-br from-surface-overlay to-surface-raised"
                        style={{ filter: `hue-rotate(${episode.episodeNumber * 35}deg)` }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex size-9 items-center justify-center rounded-full bg-accent text-fg-inverse">
                        <Play className="size-4 fill-current" aria-hidden="true" />
                      </span>
                    </span>
                    {percent > 0 && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                        <span className="block h-full bg-accent" style={{ width: `${percent}%` }} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="truncate text-sm font-semibold">{episode.title}</h3>
                      <span className="shrink-0 text-xs text-fg-subtle">
                        {formatRuntime(episode.runtimeMinutes)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{episode.overview}</p>
                    {episode.progress?.completed && (
                      <p className="mt-1 text-xs text-success">Watched</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
