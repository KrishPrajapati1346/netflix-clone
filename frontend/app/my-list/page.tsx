import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { MyListView } from '@/components/catalog/MyListView';

export const metadata: Metadata = { title: 'My list' };

export default function MyListPage() {
  return (
    <AppShell>
      <MyListView />
    </AppShell>
  );
}
