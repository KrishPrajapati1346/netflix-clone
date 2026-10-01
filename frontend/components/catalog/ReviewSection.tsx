'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Pencil, ThumbsUp, Trash2 } from 'lucide-react';
import type { MediaType, ReviewDTO, ReviewQuery } from '@shared';
import { reviewApi } from '@/lib/api/reviews';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { cn, formatRelativeDate } from '@/lib/utils';

const SORTS: Array<{ value: ReviewQuery['sort']; label: string }> = [
  { value: 'helpful', label: 'Most helpful' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'score', label: 'Highest rated' },
];

export function ReviewSection({
  mediaType,
  mediaId,
}: {
  mediaType: MediaType;
  mediaId: string;
}) {
  const { activeProfile } = useProfile();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<ReviewQuery['sort']>('helpful');
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<ReviewDTO | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reviews', mediaId, sort, activeProfile?.id],
    queryFn: () => reviewApi.list(mediaId, { sort, limit: 20 }),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['reviews', mediaId] }),
      queryClient.invalidateQueries({ queryKey: ['title'] }),
    ]);

  const remove = useMutation({
    mutationFn: (id: string) => reviewApi.remove(id),
    onSuccess: async () => {
      toast.success('Review deleted');
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const helpful = useMutation({
    mutationFn: (id: string) => reviewApi.toggleHelpful(id),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(toApiError(err).message),
  });

  const own = data?.items.find((review) => review.isOwn);

  return (
    <section aria-labelledby="reviews-heading" className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-heading" className="text-lg font-bold tracking-tight">
          Reviews {data ? <span className="text-fg-subtle">({data.total})</span> : null}
        </h2>

        <div className="flex items-center gap-2">
          <label className="text-sm">
            <span className="sr-only">Sort reviews</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewQuery['sort'])}
              className="h-9 rounded-control border border-line bg-surface px-2.5 text-sm"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {!own && !composing && (
            <Button size="sm" onClick={() => setComposing(true)}>
              Write a review
            </Button>
          )}
        </div>
      </div>

      {isError && <FormAlert tone="danger">{toApiError(error).message}</FormAlert>}

      {(composing || editing) && (
        <ReviewComposer
          mediaType={mediaType}
          mediaId={mediaId}
          existing={editing}
          onCancel={() => {
            setComposing(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setComposing(false);
            setEditing(null);
            await invalidate();
          }}
        />
      )}

      {isLoading ? (
        <ul className="space-y-3">
          {[0, 1].map((index) => (
            <li key={index} className="skeleton h-28 rounded-panel" aria-hidden="true" />
          ))}
        </ul>
      ) : data && data.items.length === 0 ? (
        <p className="rounded-panel border border-line py-10 text-center text-sm text-fg-muted">
          No reviews yet. Be the first to write one.
        </p>
      ) : (
        <ul className="space-y-3">
          {data?.items.map((review) => (
            <li key={review.id}>
              <ReviewCard
                review={review}
                onEdit={() => setEditing(review)}
                onDelete={() => {
                  if (window.confirm('Delete your review?')) remove.mutate(review.id);
                }}
                onHelpful={() => helpful.mutate(review.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewCard({
  review,
  onEdit,
  onDelete,
  onHelpful,
}: {
  review: ReviewDTO;
  onEdit: () => void;
  onDelete: () => void;
  onHelpful: () => void;
}) {
  /**
   * Spoiler-tagged bodies start hidden behind a click.
   *
   * The author's own review is never blurred — they wrote it, and hiding it
   * from them just makes editing awkward.
   */
  const [revealed, setRevealed] = useState(!review.hasSpoilers || review.isOwn);

  return (
    <article className="rounded-panel border border-line p-4">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold">{review.author.name}</span>
        <span className="text-accent" aria-label={`Rated ${review.score} out of 5`}>
          {'★'.repeat(Math.floor(review.score))}
          {review.score % 1 !== 0 ? '½' : ''}
        </span>
        <time className="text-xs text-fg-subtle" dateTime={review.createdAt}>
          {formatRelativeDate(review.createdAt)}
        </time>
        {review.isOwn && (
          <span className="rounded-full bg-accent-soft px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-accent">
            Yours
          </span>
        )}
      </header>

      <h3 className="mt-2 text-sm font-semibold">{review.title}</h3>

      {review.hasSpoilers && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-control border border-dashed border-line-strong py-6 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <Eye className="size-4" aria-hidden="true" />
          This review contains spoilers — click to reveal
        </button>
      ) : (
        <div
          className="mt-2 text-sm leading-relaxed text-fg-muted [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2"
          // Safe: the API sanitises review bodies to an allow-list of formatting
          // tags on write, so what is stored is already inert.
          dangerouslySetInnerHTML={{ __html: review.body }}
        />
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {!review.isOwn && (
          <button
            type="button"
            onClick={onHelpful}
            aria-pressed={review.viewerFoundHelpful}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
              review.viewerFoundHelpful
                ? 'border-accent text-accent'
                : 'border-line text-fg-muted hover:text-fg',
            )}
          >
            <ThumbsUp className="size-3.5" aria-hidden="true" />
            Helpful {review.helpfulCount > 0 && `(${review.helpfulCount})`}
          </button>
        )}

        {review.isOwn && (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-danger hover:text-danger">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </>
        )}

        {review.hasSpoilers && revealed && !review.isOwn && (
          <button
            type="button"
            onClick={() => setRevealed(false)}
            className="ml-auto flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg-muted"
          >
            <EyeOff className="size-3.5" aria-hidden="true" />
            Hide spoilers
          </button>
        )}
      </footer>
    </article>
  );
}

function ReviewComposer({
  mediaType,
  mediaId,
  existing,
  onCancel,
  onSaved,
}: {
  mediaType: MediaType;
  mediaId: string;
  existing: ReviewDTO | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  // Strip stored formatting tags back to plain text for editing; the API
  // re-sanitises whatever comes back.
  const [body, setBody] = useState(existing ? existing.body.replace(/<[^>]+>/g, '') : '');
  const [score, setScore] = useState(existing?.score ?? 4);
  const [hasSpoilers, setHasSpoilers] = useState(existing?.hasSpoilers ?? false);
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      existing
        ? reviewApi.update(existing.id, { title, body, score, hasSpoilers })
        : reviewApi.create({ mediaType, mediaId, title, body, score, hasSpoilers }),
    onSuccess: async () => {
      toast.success(existing ? 'Review updated' : 'Review posted');
      await onSaved();
    },
    onError: (error) => setFormError(toApiError(error).message),
  });

  return (
    <form
      className="mb-5 space-y-4 rounded-panel border border-line bg-surface-raised p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        save.mutate();
      }}
    >
      {formError && <FormAlert tone="danger">{formError}</FormAlert>}

      <Input
        label="Review title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={120}
        required
        placeholder="Sum it up in a line"
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-fg-muted">Your review</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          minLength={10}
          maxLength={5000}
          required
          placeholder="What worked, what did not, who would enjoy it?"
          className="w-full rounded-control border border-line bg-surface p-3 text-sm leading-relaxed"
        />
        <span className="mt-1 block text-xs text-fg-subtle">{body.length} / 5000</span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm">
          <span className="mb-1 block text-fg-muted">Rating</span>
          <select
            value={score}
            onChange={(event) => setScore(Number(event.target.value))}
            className="h-10 rounded-control border border-line bg-surface px-3 text-sm"
          >
            {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((value) => (
              <option key={value} value={value}>
                {value} ★
              </option>
            ))}
          </select>
        </label>

        <label className="mt-5 flex items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={hasSpoilers}
            onChange={(event) => setHasSpoilers(event.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          Contains spoilers
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={save.isPending} disabled={body.trim().length < 10}>
          {existing ? 'Save changes' : 'Post review'}
        </Button>
      </div>
    </form>
  );
}
