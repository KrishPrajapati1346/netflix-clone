'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Info, Play } from 'lucide-react';
import type { TitleDetailDTO } from '@shared';
import { artworkUrl } from '@/lib/api/catalog';
import { formatRuntime } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Full-bleed hero banner.
 *
 * The two-gradient scrim is what makes this work over arbitrary artwork: a
 * bottom gradient fades the image into the page background so the row below has
 * no visible seam, and a left gradient keeps the copy legible regardless of what
 * is behind it. Baking legibility into the layout rather than hoping the image
 * is dark enough is the difference between a hero that works for one poster and
 * one that works for the whole catalog.
 */
export function Hero({ title }: { title: TitleDetailDTO }) {
  const reduceMotion = useReducedMotion();

  const resumeSeconds = title.viewerState?.progress?.positionSeconds ?? 0;
  const isResuming = resumeSeconds > 30 && !title.viewerState?.progress?.completed;

  const watchHref =
    title.mediaType === 'tv' && title.viewerState?.nextEpisode
      ? `/watch/episode/${title.viewerState.nextEpisode.id}`
      : `/watch/movie/${title.id}`;

  return (
    <section className="relative -mt-16 h-[78vh] min-h-[30rem] w-full">
      <div className="absolute inset-0">
        <Image
          src={artworkUrl(title, 'backdrop')}
          alt=""
          fill
          // The hero is the largest contentful paint on the home page, so it is
          // never lazy-loaded.
          priority
          sizes="100vw"
          className="object-cover"
          unoptimized={!title.backdropUrl}
        />
        <div className="hero-scrim-bottom absolute inset-0" />
        <div className="hero-scrim-left absolute inset-0" />
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex h-full max-w-2xl flex-col justify-end px-(--gutter) pb-16"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          {title.mediaType === 'tv' ? 'Series' : 'Film'}
        </p>

        <h1 className="text-[clamp(2rem,5.5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
          {title.title}
        </h1>

        {title.tagline && (
          <p className="mt-3 text-base italic text-fg-muted sm:text-lg">{title.tagline}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-fg-muted">
          {title.matchScore !== null && (
            <span className="font-semibold text-success">{title.matchScore}% match</span>
          )}
          {title.releaseYear && <span>{title.releaseYear}</span>}
          <span className="rounded-sm border border-line-strong px-1.5 py-px text-xs">
            {title.maturityRating}
          </span>
          {title.mediaType === 'movie' && title.runtimeMinutes ? (
            <span>{formatRuntime(title.runtimeMinutes)}</span>
          ) : (
            title.seasons.length > 0 && (
              <span>
                {title.seasons.length} season{title.seasons.length === 1 ? '' : 's'}
              </span>
            )
          )}
          {title.averageScore > 0 && <span>★ {title.averageScore.toFixed(1)}</span>}
        </div>

        <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-fg-muted sm:text-base">
          {title.overview}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={watchHref}>
              <Play className="fill-current" aria-hidden="true" />
              {isResuming ? 'Resume' : 'Play'}
            </Link>
          </Button>

          <Button asChild size="lg" variant="subtle">
            <Link href={`/title/${title.slug}`}>
              <Info aria-hidden="true" />
              More info
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative -mt-16 h-[78vh] min-h-[30rem] w-full" aria-hidden="true">
      <div className="skeleton absolute inset-0" />
      <div className="hero-scrim-bottom absolute inset-0" />
      <div className="relative flex h-full max-w-2xl flex-col justify-end gap-4 px-(--gutter) pb-16">
        <div className="skeleton h-4 w-24 rounded-sm" />
        <div className="skeleton h-14 w-3/4 rounded-sm" />
        <div className="skeleton h-4 w-1/2 rounded-sm" />
        <div className="skeleton h-16 w-full rounded-sm" />
        <div className="flex gap-3">
          <div className="skeleton h-12 w-32 rounded-control" />
          <div className="skeleton h-12 w-36 rounded-control" />
        </div>
      </div>
    </div>
  );
}
