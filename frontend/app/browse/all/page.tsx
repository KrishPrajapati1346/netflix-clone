import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BrowseGrid } from '@/components/catalog/BrowseGrid';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

export const metadata: Metadata = { title: 'Browse everything' };

export default function BrowseAllPage() {
  return (
    <AppShell>
      {/* `useSearchParams` needs a Suspense boundary, or the whole route opts
          out of static rendering. */}
      <Suspense fallback={<FullPageSpinner label="Loading catalog" />}>
        <BrowseGrid heading="Browse everything" />
      </Suspense>
    </AppShell>
  );
}
