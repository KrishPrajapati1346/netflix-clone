'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { toApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { cn, formatRelativeDate } from '@/lib/utils';

/**
 * Review moderation.
 *
 * Hiding is reversible and non-destructive — the row stays, and its author can
 * still see it. Deleting someone's writing outright is rarely the right first
 * response, and an irreversible moderation action with no audit trail is worse.
 */
export function ModerationPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-moderation'],
    queryFn: adminApi.moderationQueue,
  });

  const setHidden = useMutation({
    mutationFn: ({ id, isHidden }: { id: string; isHidden: boolean }) =>
      adminApi.setReviewHidden(id, isHidden),
    onSuccess: async (_result, variables) => {
      toast.success(variables.isHidden ? 'Review hidden' : 'Review restored');
      await queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  if (isError) return <FormAlert tone="danger">{toApiError(error).message}</FormAlert>;

  if (isLoading) {
    return (
      <ul className="space-y-3">
        {[0, 1, 2].map((index) => (
          <li key={index} className="skeleton h-28 rounded-panel" aria-hidden="true" />
        ))}
      </ul>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-panel border border-line py-16 text-center">
        <p className="text-lg font-semibold">Nothing to moderate</p>
        <p className="mt-1 text-sm text-fg-muted">No reviews have been written yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.items.map((review) => (
        <li
          key={review.id}
          className={cn(
            'rounded-panel border p-4',
            review.isHidden ? 'border-danger/40 bg-danger-soft/20' : 'border-line',
          )}
        >
          <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold">{review.authorName}</span>
            <span className="text-accent" aria-label={`Rated ${review.score} of 5`}>
              {'★'.repeat(Math.floor(review.score))}
            </span>
            <time className="text-xs text-fg-subtle" dateTime={review.createdAt}>
              {formatRelativeDate(review.createdAt)}
            </time>
            {review.isHidden && (
              <span className="rounded-full bg-danger-soft px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-danger">
                Hidden
              </span>
            )}
          </header>

          <h3 className="mt-2 text-sm font-semibold">{review.title}</h3>
          <div
            className="mt-1 line-clamp-4 text-sm text-fg-muted"
            // Already sanitised to an allow-list of formatting tags on write.
            dangerouslySetInnerHTML={{ __html: review.body }}
          />

          <div className="mt-3">
            <Button
              variant={review.isHidden ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setHidden.mutate({ id: review.id, isHidden: !review.isHidden })}
              className={review.isHidden ? undefined : 'text-danger hover:text-danger'}
            >
              {review.isHidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
              {review.isHidden ? 'Restore' : 'Hide from others'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
