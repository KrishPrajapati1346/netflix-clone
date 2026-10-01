import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ActivityFeed } from '@/components/social/ActivityFeed';

export const metadata: Metadata = { title: 'Activity' };

export default function FeedPage() {
  return (
    <AppShell>
      <ActivityFeed />
    </AppShell>
  );
}
