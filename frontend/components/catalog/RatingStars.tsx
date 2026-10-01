'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import type { MediaType } from '@shared';
import { reviewApi } from '@/lib/api/reviews';
import { toApiError } from '@/lib/api-client';

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const STAR_SIZE_REM = 1.75;

/**
 * Half-star rating control.
 *
 * Two layers that never fight each other:
 *
 *  - A **visual layer** (`aria-hidden`) of five outline stars with a filled
 *    copy clipped to `value / 5` width. One width drives the whole display, so
 *    half-stars need no per-icon trickery.
 *  - An **interaction layer** of ten visually-hidden radios stretched across
 *    the same box. Real radios mean arrow keys work, the group is announced as
 *    one control with ten options, and there is no keyboard handling to write.
 */
export function RatingStars({
  mediaType,
  mediaId,
  value,
}: {
  mediaType: MediaType;
  mediaId: string;
  value: number | null;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(value);
  const [hovered, setHovered] = useState<number | null>(null);

  /**
   * Re-sync when the query refetches with a different profile's rating.
   *
   * Adjusted during render rather than in an effect: React re-runs this
   * component immediately without painting the stale value, whereas an effect
   * would paint the old rating first and then correct it.
   */
  const [syncedFrom, setSyncedFrom] = useState(value);
  if (value !== syncedFrom) {
    setSyncedFrom(value);
    setSelected(value);
  }

  // Setting and clearing return different bodies; neither is read here.
  const rate = useMutation<unknown, Error, number | null>({
    mutationFn: (score) =>
      score === null
        ? reviewApi.clearRating(mediaType, mediaId)
        : reviewApi.setRating({ mediaType, mediaId, score }),
    onSuccess: async (_data, score) => {
      toast.success(
        score === null ? 'Rating removed' : `Rated ${score} star${score === 1 ? '' : 's'}`,
      );
      // A rating changes both the title's average and this profile's taste
      // vector, so the home feed is stale as well.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['title'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]);
    },
    onError: (error) => {
      setSelected(value); // Roll back the optimistic paint.
      toast.error(toApiError(error).message);
    },
  });

  const shown = hovered ?? selected ?? 0;
  const width = `${(shown / 5) * 100}%`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="relative rounded-sm focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent"
        style={{ width: `${STAR_SIZE_REM * 5}rem`, height: `${STAR_SIZE_REM}rem` }}
        onMouseLeave={() => setHovered(null)}
        role="radiogroup"
        aria-label="Rate this title out of 5 stars"
      >
        <div className="absolute inset-0 flex" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((index) => (
            <Star key={index} className="size-7 shrink-0 fill-transparent text-line-strong" />
          ))}
        </div>

        <div
          className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-150 ease-out-quick"
          style={{ width }}
          aria-hidden="true"
        >
          <div className="flex" style={{ width: `${STAR_SIZE_REM * 5}rem` }}>
            {[1, 2, 3, 4, 5].map((index) => (
              <Star key={index} className="size-7 shrink-0 fill-accent text-accent" />
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex">
          {STEPS.map((step) => (
            <label
              key={step}
              className="h-full flex-1 cursor-pointer"
              onMouseEnter={() => setHovered(step)}
              title={`${step} star${step === 1 ? '' : 's'}`}
            >
              <input
                type="radio"
                name={`rating-${mediaId}`}
                value={step}
                checked={selected === step}
                disabled={rate.isPending}
                onChange={() => {
                  setSelected(step);
                  rate.mutate(step);
                }}
                className="sr-only"
              />
              <span className="sr-only">
                {step} star{step === 1 ? '' : 's'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {selected === null ? (
        <span className="text-sm text-fg-subtle">Not rated</span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            rate.mutate(null);
          }}
          className="text-xs text-fg-subtle underline-offset-4 transition-colors hover:text-fg-muted hover:underline"
        >
          Clear rating
        </button>
      )}
    </div>
  );
}
