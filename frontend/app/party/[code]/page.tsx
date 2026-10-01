import type { Metadata } from 'next';
import { WatchPartyRoom } from '@/components/party/WatchPartyRoom';
import { RequireAuth } from '@/components/auth/RouteGuard';

export const metadata: Metadata = { title: 'Watch party' };

export default async function PartyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <RequireAuth>
      <WatchPartyRoom code={code.toUpperCase()} />
    </RequireAuth>
  );
}
