import type { Metadata } from 'next';
import { WatchScreen } from '@/components/player/WatchScreen';
import { RequireAuth } from '@/components/auth/RouteGuard';

export const metadata: Metadata = { title: 'Watch' };

/**
 * `/watch/movie/:id` and `/watch/episode/:id`.
 *
 * One route for both because the player is identical; only the fetch differs.
 * Params are awaited — Next 16 makes `params` a promise so a page can start
 * streaming before route resolution completes.
 */
export default async function WatchPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;

  return (
    <RequireAuth>
      <WatchScreen kind={kind === 'episode' ? 'episode' : 'movie'} id={id} />
    </RequireAuth>
  );
}
