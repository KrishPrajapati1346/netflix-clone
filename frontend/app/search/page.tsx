import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SearchView } from '@/components/search/SearchView';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <AppShell>
      {/* `useSearchParams` needs a Suspense boundary in the App Router. */}
      <Suspense fallback={<FullPageSpinner label="Loading search" />}>
        <SearchView />
      </Suspense>
    </AppShell>
  );
}
