import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BrowseGrid } from '@/components/catalog/BrowseGrid';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

export const metadata: Metadata = { title: 'Series' };

export default function SeriesPage() {
  return (
    <AppShell>
      <Suspense fallback={<FullPageSpinner label="Loading series" />}>
        <BrowseGrid fixedType="tv" heading="Series" />
      </Suspense>
    </AppShell>
  );
}
