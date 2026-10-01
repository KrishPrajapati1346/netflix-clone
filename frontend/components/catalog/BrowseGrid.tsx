'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  GENRES,
  LANGUAGES,
  MATURITY_RATINGS,
  type CatalogQuery,
  type MediaType,
} from '@shared';
import { catalogApi } from '@/lib/api/catalog';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TitleCard, TitleCardSkeleton } from './TitleCard';
import { cn } from '@/lib/utils';

const SORTS: Array<{ value: CatalogQuery['sort']; label: string }> = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'releaseDate', label: 'Release date' },
  { value: 'title', label: 'Title' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'newest', label: 'Recently added' },
];

/**
 * Filterable, sortable, paginated catalog grid.
 *
 * Filter state lives in the URL rather than component state, so a filtered view
 * is linkable, survives a refresh, and works with the browser's back button —
 * all of which a `useState` filter panel silently breaks.
 */
export function BrowseGrid({
  fixedType,
  heading,
}: {
  /** Locks the media type for /browse/movies and /browse/series. */
  fixedType?: MediaType;
  heading: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProfile } = useProfile();

  const query = useMemo<Partial<CatalogQuery>>(() => {
    const genre = searchParams.getAll('genre');
    const language = searchParams.getAll('language');
    const rating = searchParams.getAll('rating');

    return {
      page: Number(searchParams.get('page') ?? 1),
      limit: 30,
      ...(fixedType ? { type: fixedType } : {}),
      ...(genre.length ? { genre: genre as CatalogQuery['genre'] } : {}),
      ...(language.length ? { language: language as CatalogQuery['language'] } : {}),
      ...(rating.length ? { rating: rating as CatalogQuery['rating'] } : {}),
      sort: (searchParams.get('sort') as CatalogQuery['sort']) ?? 'popularity',
      order: (searchParams.get('order') as 'asc' | 'desc') ?? 'desc',
      ...(searchParams.get('yearFrom') ? { yearFrom: Number(searchParams.get('yearFrom')) } : {}),
      ...(searchParams.get('yearTo') ? { yearTo: Number(searchParams.get('yearTo')) } : {}),
    };
  }, [searchParams, fixedType]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['browse', query, activeProfile?.id],
    queryFn: () => catalogApi.browse(query),
    // Keeps the previous page rendered while the next loads, so paging does not
    // flash an empty grid and collapse the scroll position.
    placeholderData: keepPreviousData,
  });

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Any filter change invalidates the current page number.
      params.delete('page');
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const toggleValue = (key: string, value: string) =>
    update((params) => {
      const current = params.getAll(key);
      params.delete(key);
      for (const entry of current.filter((v) => v !== value)) params.append(key, entry);
      if (!current.includes(value)) params.append(key, value);
    });

  const activeFilters = [
    ...searchParams.getAll('genre'),
    ...searchParams.getAll('language'),
    ...searchParams.getAll('rating'),
  ];

  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="px-(--gutter) py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
          {data && (
            <p className="mt-1 text-sm text-fg-subtle">
              {data.total} title{data.total === 1 ? '' : 's'}
              {activeFilters.length > 0 && ' matching your filters'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-fg-subtle">Sort by</span>
            <select
              value={query.sort}
              onChange={(event) => update((params) => params.set('sort', event.target.value))}
              className="h-10 rounded-control border border-line bg-surface px-3 text-sm"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() =>
              update((params) => params.set('order', query.order === 'asc' ? 'desc' : 'asc'))
            }
            className="h-10 rounded-control border border-line px-3 text-sm text-fg-muted transition-colors hover:text-fg"
            aria-label={`Sort ${query.order === 'asc' ? 'descending' : 'ascending'}`}
          >
            {query.order === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      <details className="mb-6 rounded-panel border border-line" open={activeFilters.length > 0}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeFilters.length > 0 && (
            <span className="rounded-full bg-accent px-2 py-px text-xs font-semibold text-fg-inverse">
              {activeFilters.length}
            </span>
          )}
        </summary>

        <div className="space-y-4 border-t border-line p-4">
          <FilterGroup
            label="Genre"
            options={GENRES.map((genre) => ({ value: genre, label: genre }))}
            selected={searchParams.getAll('genre')}
            onToggle={(value) => toggleValue('genre', value)}
          />
          <FilterGroup
            label="Language"
            options={LANGUAGES.map((entry) => ({ value: entry.code, label: entry.label }))}
            selected={searchParams.getAll('language')}
            onToggle={(value) => toggleValue('language', value)}
          />
          <FilterGroup
            label="Maturity rating"
            options={MATURITY_RATINGS.map((rating) => ({ value: rating, label: rating }))}
            selected={searchParams.getAll('rating')}
            onToggle={(value) => toggleValue('rating', value)}
          />

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-fg-subtle">Year from</span>
              <input
                type="number"
                min={1888}
                max={2200}
                defaultValue={searchParams.get('yearFrom') ?? ''}
                onBlur={(event) =>
                  update((params) =>
                    event.target.value
                      ? params.set('yearFrom', event.target.value)
                      : params.delete('yearFrom'),
                  )
                }
                className="h-10 w-28 rounded-control border border-line bg-surface px-3 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-fg-subtle">Year to</span>
              <input
                type="number"
                min={1888}
                max={2200}
                defaultValue={searchParams.get('yearTo') ?? ''}
                onBlur={(event) =>
                  update((params) =>
                    event.target.value
                      ? params.set('yearTo', event.target.value)
                      : params.delete('yearTo'),
                  )
                }
                className="h-10 w-28 rounded-control border border-line bg-surface px-3 text-sm"
              />
            </label>

            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => router.push('?')}>
                <X aria-hidden="true" />
                Clear all
              </Button>
            )}
          </div>
        </div>
      </details>

      {isError && <FormAlert tone="danger">{toApiError(error).message}</FormAlert>}

      {isLoading ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 18 }, (_, index) => (
            <li key={index}>
              <TitleCardSkeleton />
            </li>
          ))}
        </ul>
      ) : data && data.items.length === 0 ? (
        <div className="rounded-panel border border-line py-20 text-center">
          <p className="text-lg font-semibold">No titles match those filters</p>
          <p className="mt-1 text-sm text-fg-muted">Try widening or clearing them.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('?')}>
            Clear filters
          </Button>
        </div>
      ) : (
        <ul
          className={cn(
            'grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-4 lg:grid-cols-6',
            isFetching && 'opacity-60',
          )}
        >
          {data?.items.map((title, index) => (
            <li key={title.id}>
              <TitleCard title={title} priority={index < 6} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() =>
              router.push(
                `?${new URLSearchParams({ ...paramsObject(searchParams), page: String(page - 1) })}`,
              )
            }
          >
            Previous
          </Button>
          <span className="text-sm text-fg-muted" aria-live="polite">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(
                `?${new URLSearchParams({ ...paramsObject(searchParams), page: String(page + 1) })}`,
              )
            }
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

/** Flattens repeated params for rebuilding a query string on page change. */
function paramsObject(params: URLSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors duration-150',
                active
                  ? 'border-accent bg-accent text-fg-inverse'
                  : 'border-line text-fg-muted hover:border-fg-subtle hover:text-fg',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
