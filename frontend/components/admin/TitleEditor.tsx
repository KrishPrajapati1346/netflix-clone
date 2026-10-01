'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { GENRES, LANGUAGES, MATURITY_RATINGS, type Genre, type MaturityRating } from '@shared';
import { adminApi } from '@/lib/api/admin';
import { toApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Create a film or series from the admin panel.
 *
 * The playable source is part of the create form rather than a later step: a
 * title with no source is a dead end for viewers, and the whole point of the
 * exit criterion is that an admin can add something and immediately watch it.
 */
export function TitleEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [tagline, setTagline] = useState('');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [language, setLanguage] = useState('en');
  const [maturityRating, setMaturityRating] = useState<MaturityRating>('PG-13');
  const [releaseDate, setReleaseDate] = useState('');
  const [runtimeMinutes, setRuntimeMinutes] = useState(90);
  const [sourceUrl, setSourceUrl] = useState('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  const [isPublished, setIsPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Creating a film and creating a series return different bodies; the caller
  // only needs to know it succeeded.
  const save = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const shared = {
        title,
        overview,
        ...(tagline ? { tagline } : {}),
        genres,
        language: language as never,
        maturityRating,
        isPublished,
        isFeatured: false,
        cast: [],
        directors: [],
        keywords: [],
      };

      if (mediaType === 'movie') {
        return adminApi.createMovie({
          ...shared,
          runtimeMinutes,
          ...(releaseDate ? { releaseDate: new Date(releaseDate) } : {}),
          sources: sourceUrl ? [{ label: 'auto', url: sourceUrl, type: 'hls' }] : [],
          subtitles: [],
          chapters: [],
        } as never);
      }

      return adminApi.createShow({
        ...shared,
        ...(releaseDate ? { firstAirDate: new Date(releaseDate) } : {}),
        status: 'returning',
      } as never);
    },
    onSuccess: async () => {
      toast.success(
        mediaType === 'movie'
          ? 'Film added — it is live on the site now'
          : 'Series added — add seasons and episodes next',
      );
      await onSaved();
    },
    onError: (error) => setFormError(toApiError(error).message),
  });

  const toggleGenre = (genre: Genre) =>
    setGenres((current) =>
      current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre],
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add a title"
    >
      <form
        className="my-8 w-full max-w-2xl space-y-5 rounded-panel border border-line bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          save.mutate();
        }}
      >
        <h2 className="text-xl font-bold">Add a title</h2>

        {formError && <FormAlert tone="danger">{formError}</FormAlert>}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg-muted">Type</legend>
          <div className="flex gap-2">
            {(['movie', 'tv'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMediaType(option)}
                aria-pressed={mediaType === option}
                className={cn(
                  'rounded-control border px-4 py-2 text-sm transition-colors',
                  mediaType === option
                    ? 'border-accent bg-accent text-fg-inverse'
                    : 'border-line text-fg-muted hover:text-fg',
                )}
              >
                {option === 'movie' ? 'Film' : 'Series'}
              </button>
            ))}
          </div>
        </fieldset>

        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={200}
          autoFocus
        />

        <Input
          label="Tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          maxLength={300}
          hint="Optional one-liner shown under the title."
        />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fg-muted">Overview</span>
          <textarea
            value={overview}
            onChange={(event) => setOverview(event.target.value)}
            rows={4}
            maxLength={5000}
            className="w-full rounded-control border border-line bg-surface p-3 text-sm leading-relaxed"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg-muted">
            Genres <span className="text-fg-subtle">(pick at least one)</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                aria-pressed={genres.includes(genre)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  genres.includes(genre)
                    ? 'border-accent bg-accent text-fg-inverse'
                    : 'border-line text-fg-muted hover:text-fg',
                )}
              >
                {genre}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fg-muted">Language</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm"
            >
              {LANGUAGES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fg-muted">Maturity</span>
            <select
              value={maturityRating}
              onChange={(event) => setMaturityRating(event.target.value as MaturityRating)}
              className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm"
            >
              {MATURITY_RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fg-muted">
              {mediaType === 'movie' ? 'Release date' : 'First aired'}
            </span>
            <input
              type="date"
              value={releaseDate}
              onChange={(event) => setReleaseDate(event.target.value)}
              className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm"
            />
          </label>
        </div>

        {mediaType === 'movie' && (
          <>
            <Input
              label="Runtime (minutes)"
              type="number"
              min={1}
              max={1000}
              value={runtimeMinutes}
              onChange={(event) => setRuntimeMinutes(Number(event.target.value))}
              required
            />

            <Input
              label="HLS source URL"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              hint="An .m3u8 manifest. Pre-filled with a public test stream so the title is playable immediately."
            />
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          Publish immediately (visible to viewers straight away)
        </label>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" block onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            block
            isLoading={save.isPending}
            disabled={title.trim().length === 0 || genres.length === 0}
          >
            Add title
          </Button>
        </div>
      </form>
    </div>
  );
}
