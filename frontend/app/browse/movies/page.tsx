import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BrowseGrid } from '@/components/catalog/BrowseGrid';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

export const metadata: Metadata = { title: 'Films' };

export default function MoviesPage() {
  return (
    <AppShell>
      {/* `useSearchParams` needs a Suspense boundary, or the whole route opts
          out of static rendering. */}
      <Suspense fallback={<FullPageSpinner label="Loading films" />}>
        <BrowseGrid fixedType="movie" heading="Films" />
      </Suspense>
    </AppShell>
  );
}
