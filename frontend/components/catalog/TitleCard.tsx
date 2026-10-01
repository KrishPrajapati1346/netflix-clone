'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Info, Play, Plus } from 'lucide-react';
import type { ProgressDTO, TitleSummaryDTO } from '@shared';
import { artworkUrl } from '@/lib/api/catalog';
import { cn, formatRuntime } from '@/lib/utils';

/**
 * A poster card with the hover-expand behaviour the format is known for.
 *
 * Three details do most of the work of making this feel finished:
 *
 *  - **The overlay is delayed (~450ms).** Revealing metadata the instant the
 *    cursor crosses a card makes a row flicker as the pointer travels across
 *    it. The delay means only a deliberate hover triggers it.
 *  - **Scale and lift, not a layout change.** Transform-only animation stays on
 *    the compositor and never reflows the row.
 *  - **Ease-out, never linear.** Linear easing is the clearest tell of an
 *    unpolished clone.
 *
 * Reduced-motion users get the same information with no scaling or delay.
 */
export function TitleCard({
  title,
  progress,
  priority = false,
  className,
}: {
  title: TitleSummaryDTO;
  progress?: ProgressDTO | null;
  /** Set on the first few cards so LCP artwork is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduceMotion = useReducedMotion();

  const openSoon = () => {
    if (reduceMotion) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setExpanded(true), 450);
  };

  const closeNow = () => {
    clearTimeout(timer.current);
    setExpanded(false);
  };

  const href = `/title/${title.slug}`;
  const percent = progress ? Math.round(progress.percent * 100) : 0;

  return (
    <div
      className={cn('group relative', className)}
      onMouseEnter={openSoon}
      onMouseLeave={closeNow}
      // Keyboard users get the overlay on focus, with no artificial delay —
      // tabbing is already deliberate.
      onFocus={() => setExpanded(true)}
      onBlur={closeNow}
    >
      <Link
        href={href}
        className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        aria-label={`${title.title}${title.releaseYear ? `, ${title.releaseYear}` : ''}`}
      >
        <motion.div
          animate={{ scale: expanded && !reduceMotion ? 1.08 : 1 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'relative aspect-2/3 overflow-hidden rounded-card bg-surface-raised',
            expanded && 'z-20 shadow-2xl shadow-black/60',
          )}
        >
          <Image
            src={artworkUrl(title, 'poster')}
            alt=""
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 22vw, 15vw"
            className="object-cover"
            priority={priority}
            // Generated artwork is SVG; Next's optimiser cannot resize it, and
            // it is already tiny.
            unoptimized={!title.posterUrl}
          />

          {progress && percent > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
              <div
                className="h-full bg-accent"
                style={{ width: `${percent}%` }}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${percent}% watched`}
              />
            </div>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/55 to-transparent p-3"
              >
                <p className="line-clamp-2 text-sm font-semibold leading-tight">{title.title}</p>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fg-muted">
                  {title.matchScore !== null && (
                    <span className="font-semibold text-success">{title.matchScore}% match</span>
                  )}
                  <span className="rounded-sm border border-line-strong px-1 leading-4">
                    {title.maturityRating}
                  </span>
                  {title.releaseYear && <span>{title.releaseYear}</span>}
                  {title.runtimeMinutes ? <span>{formatRuntime(title.runtimeMinutes)}</span> : null}
                </div>

                <p className="mt-1 line-clamp-1 text-[11px] text-fg-subtle">
                  {title.genres.slice(0, 3).join(' · ')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </div>
  );
}

/** Skeleton with the card's exact geometry, so nothing shifts when data lands. */
export function TitleCardSkeleton() {
  return <div className="skeleton aspect-2/3 rounded-card" aria-hidden="true" />;
}

/** Compact horizontal card used by Continue Watching and episode lists. */
export function WideTitleCard({
  title,
  progress,
  href,
  overline,
}: {
  title: TitleSummaryDTO;
  progress?: ProgressDTO | null;
  href: string;
  overline?: string;
}) {
  const percent = progress ? Math.round(progress.percent * 100) : 0;

  return (
    <Link
      href={href}
      className="group block rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <div className="relative aspect-video overflow-hidden rounded-card bg-surface-raised">
        <Image
          src={artworkUrl(title, 'backdrop')}
          alt=""
          fill
          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 34vw, 24vw"
          className="object-cover transition-transform duration-300 ease-out-quick group-hover:scale-105"
          unoptimized={!title.backdropUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-fg-inverse">
            <Play className="size-5 fill-current" aria-hidden="true" />
          </span>
        </div>

        {percent > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
            <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <div className="mt-2">
        {overline && <p className="text-[11px] uppercase tracking-wide text-accent">{overline}</p>}
        <p className="line-clamp-1 text-sm font-medium">{title.title}</p>
      </div>
    </Link>
  );
}

export { Info, Plus };
