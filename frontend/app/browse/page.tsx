import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { HomeFeed } from '@/components/catalog/HomeFeed';

export const metadata: Metadata = { title: 'Home' };

export default function BrowsePage() {
  return (
    <AppShell>
      <HomeFeed />
    </AppShell>
  );
}
