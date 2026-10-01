'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { catalogApi } from '@/lib/api/catalog';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { CatalogRow } from './CatalogRow';
import { Hero, HeroSkeleton } from './Hero';
import { FormAlert } from '@/components/ui/form-alert';
import { Button } from '@/components/ui/button';

/**
 * The personalised home page.
 *
 * One request returns the hero and every row, rather than a request per row.
 * A dozen parallel row requests would each re-derive the same taste vector, and
 * the server could not de-duplicate titles across rows — which is what stops
 * the same five popular titles appearing in every carousel.
 */
export function HomeFeed() {
  const { activeProfile } = useProfile();

  const { data, isLoading, isError, error, refetch } = useQuery({
    // Keyed by profile so switching profiles cannot serve the previous one's feed.
    queryKey: ['home', activeProfile?.id],
    queryFn: catalogApi.home,
    enabled: Boolean(activeProfile),
  });

  if (isLoading) {
    return (
      <>
        <HeroSkeleton />
        <div className="space-y-8 pb-16">
          {['a', 'b', 'c'].map((key) => (
            <CatalogRow
              key={key}
              row={{ key, title: ' ', reason: null, items: [] }}
              isLoading
            />
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <div className="px-(--gutter) py-20">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <FormAlert tone="danger">{toApiError(error).message}</FormAlert>
          <Button onClick={() => void refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // An empty catalog is a real state on a fresh database — say what to do about
  // it rather than rendering a blank page.
  if (data.rows.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-(--gutter) text-center">
        <h1 className="text-2xl font-bold">Nothing here yet</h1>
        <p className="max-w-md text-sm text-fg-muted">
          The catalog is empty. Run <code className="rounded bg-surface-raised px-1.5 py-0.5">npm run seed</code>{' '}
          to load the sample catalog, or add titles from the admin dashboard.
        </p>
        <Button asChild variant="outline">
          <Link href="/account">Back to account</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {data.hero && <Hero title={data.hero} />}

      <div className="relative z-10 space-y-8 pb-20">
        {data.rows.map((row, index) => (
          <CatalogRow key={row.key} row={row} priority={index === 0} />
        ))}
      </div>
    </>
  );
}
