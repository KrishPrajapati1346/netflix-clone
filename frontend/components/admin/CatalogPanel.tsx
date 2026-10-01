'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Plus, Search, Star, Trash2 } from 'lucide-react';
import type { AdminCatalogRow } from '@/lib/api/admin';
import { adminApi } from '@/lib/api/admin';
import { toApiError } from '@/lib/api-client';
import { useDebounced } from '@/hooks/useDebounced';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TitleEditor } from './TitleEditor';
import { cn } from '@/lib/utils';

/**
 * The catalog table.
 *
 * Publish and feature are toggled inline rather than behind an edit form: they
 * are the two things an editor changes constantly, and making them one click
 * is the difference between a usable admin panel and a chore.
 */
export function CatalogPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 250);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-catalog', page, debouncedSearch],
    queryFn: () => adminApi.catalog(page, debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-catalog'] }),
      // The public feed reads the same records, so its cache is stale too.
      queryClient.invalidateQueries({ queryKey: ['home'] }),
      queryClient.invalidateQueries({ queryKey: ['browse'] }),
    ]);

  // Films and series return differently-shaped bodies and neither is read
  // here, so the result type is widened rather than unifying the API client.
  const patch = useMutation<unknown, Error, { row: AdminCatalogRow; changes: Record<string, boolean> }>({
    mutationFn: ({ row, changes }) =>
      row.mediaType === 'movie'
        ? adminApi.updateMovie(row.id, changes)
        : adminApi.updateShow(row.id, changes),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const remove = useMutation<unknown, Error, AdminCatalogRow>({
    mutationFn: (row) =>
      row.mediaType === 'movie' ? adminApi.deleteMovie(row.id) : adminApi.deleteShow(row.id),
    onSuccess: async () => {
      toast.success('Title deleted');
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Filter by title"
            aria-label="Filter catalog"
            className="h-10 w-full rounded-control border border-line bg-surface pl-9 pr-3 text-sm"
          />
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Add title
        </Button>
      </div>

      {isError && <FormAlert tone="danger">{toApiError(error).message}</FormAlert>}

      <div className="overflow-x-auto rounded-panel border border-line">
        <table className="w-full min-w-3xl text-sm">
          <caption className="sr-only">Catalog titles</caption>
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-fg-subtle">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Title</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Type</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Rating</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Score</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Live</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Featured</th>
              <th scope="col" className="px-3 py-2.5 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {isLoading
              ? Array.from({ length: 8 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="skeleton h-5 rounded-sm" aria-hidden="true" />
                    </td>
                  </tr>
                ))
              : data?.items.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-raised/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.title}</span>
                        <Link
                          href={`/title/${row.slug}`}
                          className="text-fg-subtle hover:text-accent"
                          aria-label={`View ${row.title} on the site`}
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                      <p className="mt-0.5 text-xs text-fg-subtle">{row.genres.slice(0, 3).join(' · ')}</p>
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted">
                      {row.mediaType === 'tv' ? 'Series' : 'Film'}
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted">{row.maturityRating}</td>
                    <td className="px-3 py-2.5 tabular-nums text-fg-muted">
                      {row.averageScore > 0 ? `★ ${row.averageScore}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Toggle
                        checked={row.isPublished}
                        label={`Published: ${row.title}`}
                        onChange={(value) => patch.mutate({ row, changes: { isPublished: value } })}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => patch.mutate({ row, changes: { isFeatured: !row.isFeatured } })}
                        aria-label={`${row.isFeatured ? 'Unfeature' : 'Feature'} ${row.title}`}
                        aria-pressed={row.isFeatured}
                        className={cn(
                          'rounded p-1 transition-colors',
                          row.isFeatured ? 'text-accent' : 'text-fg-subtle hover:text-fg',
                        )}
                      >
                        <Star className={cn('size-4', row.isFeatured && 'fill-current')} aria-hidden="true" />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${row.title}"? This also removes it from every profile's lists and history.`,
                            )
                          ) {
                            remove.mutate(row);
                          }
                        }}
                        aria-label={`Delete ${row.title}`}
                        className="rounded p-1 text-fg-subtle transition-colors hover:text-danger"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Catalog pagination">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-fg-muted" aria-live="polite">
            Page {data.page} of {data.totalPages} · {data.total} titles
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </nav>
      )}

      {creating && (
        <TitleEditor
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await invalidate();
          }}
        />
      )}
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-surface-overlay',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-4.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
