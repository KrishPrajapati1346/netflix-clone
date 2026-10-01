'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Clock, Search as SearchIcon, TrendingUp, X } from 'lucide-react';
import { searchApi } from '@/lib/api/search';
import { toApiError } from '@/lib/api-client';
import { useDebounced } from '@/hooks/useDebounced';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TitleCard, TitleCardSkeleton } from '@/components/catalog/TitleCard';

/**
 * Instant search.
 *
 * The query lives in the URL so a result set is shareable and survives a
 * refresh, but the *input* is local state — binding the field directly to the
 * URL would push a history entry per keystroke and make the back button
 * unusable. The URL is synced only once typing settles.
 */
export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeProfile } = useProfile();

  const initial = searchParams.get('q') ?? '';
  const [term, setTerm] = useState(initial);
  const debounced = useDebounced(term, 250);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mirror the settled term into the URL, replacing rather than pushing so the
  // back button leaves search entirely instead of walking back through letters.
  useEffect(() => {
    const trimmed = debounced.trim();
    const current = searchParams.get('q') ?? '';
    if (trimmed === current) return;

    router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search', {
      scroll: false,
    });
  }, [debounced, router, searchParams]);

  const query = debounced.trim();
  const hasQuery = query.length > 0;

  const results = useQuery({
    queryKey: ['search', query, activeProfile?.id],
    queryFn: () => searchApi.search({ q: query, limit: 30 }),
    enabled: hasQuery,
    // Keeps the previous result set on screen while the next loads, so the grid
    // does not blink empty between keystrokes.
    placeholderData: keepPreviousData,
  });

  const history = useQuery({
    queryKey: ['search-history', activeProfile?.id],
    queryFn: searchApi.history,
    enabled: Boolean(activeProfile) && !hasQuery,
  });

  const trending = useQuery({
    queryKey: ['search-trending'],
    queryFn: searchApi.trending,
    enabled: !hasQuery,
  });

  const clearHistory = useMutation({
    mutationFn: searchApi.clearHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-history'] }),
  });

  return (
    <div className="px-(--gutter) py-8">
      <div className="relative mx-auto max-w-2xl">
        <SearchIcon
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search films, series, cast and crew"
          aria-label="Search the catalog"
          className="h-14 w-full rounded-control border border-line bg-surface pl-12 pr-12 text-base outline-none transition-colors focus:border-accent"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-fg-subtle transition-colors hover:text-fg"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {!hasQuery && (
        <div className="mx-auto mt-10 max-w-2xl space-y-8">
          {history.data && history.data.terms.length > 0 && (
            <TermList
              icon={<Clock className="size-4" aria-hidden="true" />}
              heading="Recent searches"
              terms={history.data.terms}
              onPick={setTerm}
              action={
                <button
                  type="button"
                  onClick={() => clearHistory.mutate()}
                  className="text-xs text-fg-subtle underline-offset-4 hover:text-fg-muted hover:underline"
                >
                  Clear
                </button>
              }
            />
          )}

          {trending.data && trending.data.terms.length > 0 && (
            <TermList
              icon={<TrendingUp className="size-4" aria-hidden="true" />}
              heading="Trending searches"
              terms={trending.data.terms}
              onPick={setTerm}
            />
          )}

          {history.data?.terms.length === 0 && trending.data?.terms.length === 0 && (
            <p className="text-center text-sm text-fg-subtle">
              Search by title, cast member, director or theme.
            </p>
          )}
        </div>
      )}

      {hasQuery && (
        <div className="mt-8">
          {results.isError && <FormAlert tone="danger">{toApiError(results.error).message}</FormAlert>}

          {results.isLoading ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }, (_, index) => (
                <li key={index}>
                  <TitleCardSkeleton />
                </li>
              ))}
            </ul>
          ) : results.data && results.data.items.length === 0 ? (
            <div className="rounded-panel border border-line py-20 text-center">
              <p className="text-lg font-semibold">No results for “{query}”</p>
              <p className="mt-1 text-sm text-fg-muted">
                Check the spelling, or try a cast member, director or genre.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setTerm('')}>
                Clear search
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-fg-subtle" aria-live="polite">
                {results.data?.total} result{results.data?.total === 1 ? '' : 's'} for “{query}”
                {results.data?.didYouMean && (
                  <span className="ml-2 text-fg-muted">
                    — no exact match, showing closest titles
                  </span>
                )}
              </p>

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {results.data?.items.map((title, index) => (
                  <li key={title.id}>
                    <TitleCard title={title} priority={index < 6} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TermList({
  icon,
  heading,
  terms,
  onPick,
  action,
}: {
  icon: React.ReactNode;
  heading: string;
  terms: string[];
  onPick: (term: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-fg-subtle">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-subtle">{heading}</h2>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <ul className="flex flex-wrap gap-2">
        {terms.map((entry) => (
          <li key={entry}>
            <button
              type="button"
              onClick={() => onPick(entry)}
              className="rounded-full border border-line px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg"
            >
              {entry}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
