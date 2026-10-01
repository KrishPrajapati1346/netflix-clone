'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import type { ListKind } from '@shared';
import { libraryApi } from '@/lib/api/catalog';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { TitleCard, TitleCardSkeleton } from './TitleCard';
import { cn } from '@/lib/utils';

const TABS: Array<{ kind: ListKind; label: string; empty: string }> = [
  {
    kind: 'my_list',
    label: 'My list',
    empty: 'Titles you save with the + button appear here.',
  },
  {
    kind: 'favorites',
    label: 'Favourites',
    empty: 'Nothing marked as a favourite yet.',
  },
  {
    kind: 'watch_later',
    label: 'Watch later',
    empty: 'Nothing queued for later yet.',
  },
];

export function MyListView() {
  const [kind, setKind] = useState<ListKind>('my_list');
  const { activeProfile } = useProfile();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['list', kind, activeProfile?.id],
    queryFn: () => libraryApi.getList(kind),
    enabled: Boolean(activeProfile),
  });

  const active = TABS.find((tab) => tab.kind === kind)!;

  return (
    <div className="px-(--gutter) py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your library</h1>
      <p className="mt-1 text-sm text-fg-subtle">
        Saved to {activeProfile?.name}. Each profile keeps its own lists.
      </p>

      <div role="tablist" aria-label="List type" className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            role="tab"
            type="button"
            aria-selected={kind === tab.kind}
            onClick={() => setKind(tab.kind)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors',
              kind === tab.kind
                ? 'border-accent font-semibold text-fg'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isError && <FormAlert tone="danger">{toApiError(error).message}</FormAlert>}

        {isLoading ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }, (_, index) => (
              <li key={index}>
                <TitleCardSkeleton />
              </li>
            ))}
          </ul>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-panel border border-line py-20 text-center">
            <p className="text-lg font-semibold">Nothing here yet</p>
            <p className="mt-1 text-sm text-fg-muted">{active.empty}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/browse/all">Browse the catalog</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {data?.items.map((title, index) => (
              <li key={title.id}>
                <TitleCard title={title} priority={index < 6} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
