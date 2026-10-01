'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { CatalogRowDTO } from '@shared';
import { cn } from '@/lib/utils';
import { TitleCard, TitleCardSkeleton } from './TitleCard';

/**
 * A horizontally scrolling carousel row.
 *
 * Built on native scrolling with CSS scroll-snap rather than a transform-driven
 * carousel: it gives touch momentum, trackpad gestures, keyboard scrolling and
 * screen-reader traversal for free, all of which a custom implementation has to
 * rebuild badly. The arrows just call `scrollBy`.
 *
 * The peek of the next card at the right edge is deliberate — it is the cue
 * that tells a viewer the row continues.
 */
export function CatalogRow({
  row,
  isLoading = false,
  priority = false,
}: {
  row: CatalogRowDTO;
  isLoading?: boolean;
  priority?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const element = scroller.current;
    if (!element) return;

    setCanScrollLeft(element.scrollLeft > 8);
    // The 8px tolerance absorbs sub-pixel rounding, which otherwise leaves the
    // right arrow visible at the true end of the row.
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const element = scroller.current;
    if (!element) return;

    const observer = new ResizeObserver(updateArrows);
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateArrows, row.items.length]);

  const scrollByPage = (direction: 1 | -1) => {
    const element = scroller.current;
    if (!element) return;
    // Leave one card of overlap so nothing is skipped past between pages.
    element.scrollBy({ left: direction * (element.clientWidth * 0.85), behavior: 'smooth' });
  };

  if (!isLoading && row.items.length === 0) return null;

  return (
    <section className="group/row relative" aria-labelledby={`row-${row.key}`}>
      <div className="mb-2 flex items-baseline gap-2 px-(--gutter)">
        <h2 id={`row-${row.key}`} className="text-lg font-bold tracking-tight">
          {row.title}
        </h2>

        {row.reason && (
          <span className="group/reason relative hidden items-center sm:inline-flex">
            <Info className="size-3.5 text-fg-subtle" aria-hidden="true" />
            {/*
              Recommendations explain themselves. A row that says "because you
              watched X" is trustworthy in a way an unexplained one is not.
            */}
            <span className="pointer-events-none absolute left-5 top-1/2 z-30 w-64 -translate-y-1/2 rounded-control border border-line bg-surface-overlay p-2.5 text-xs leading-relaxed text-fg-muted opacity-0 shadow-xl transition-opacity duration-200 group-hover/reason:opacity-100">
              {row.reason}
            </span>
            <span className="sr-only">{row.reason}</span>
          </span>
        )}
      </div>

      <div className="relative">
        {canScrollLeft && (
          <ArrowButton side="left" onClick={() => scrollByPage(-1)} label={`Scroll ${row.title} left`} />
        )}
        {canScrollRight && (
          <ArrowButton side="right" onClick={() => scrollByPage(1)} label={`Scroll ${row.title} right`} />
        )}

        <div
          ref={scroller}
          onScroll={updateArrows}
          className={cn(
            'scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-(--gutter)',
            // Vertical padding leaves room for the hover scale to grow into
            // without being clipped by the scroll container.
            'py-3',
          )}
        >
          {isLoading
            ? Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="w-[38vw] shrink-0 snap-start sm:w-[22vw] lg:w-[15vw]">
                  <TitleCardSkeleton />
                </div>
              ))
            : row.items.map((item, index) => (
                <div key={item.id} className="w-[38vw] shrink-0 snap-start sm:w-[22vw] lg:w-[15vw]">
                  <TitleCard title={item} priority={priority && index < 5} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

function ArrowButton({
  side,
  onClick,
  label,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-0 bottom-0 z-30 hidden w-12 items-center justify-center md:flex',
        'bg-canvas/70 text-fg opacity-0 transition-opacity duration-200 ease-out-quick',
        // Revealed on row hover, but always reachable by keyboard.
        'group-hover/row:opacity-100 focus-visible:opacity-100',
        'hover:bg-canvas/90',
        side === 'left' ? 'left-0' : 'right-0',
      )}
    >
      <Icon className="size-7" aria-hidden="true" />
    </button>
  );
}
