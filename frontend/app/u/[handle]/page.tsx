import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { PublicProfileView } from '@/components/social/PublicProfileView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  return (
    <AppShell>
      <PublicProfileView handle={handle} />
    </AppShell>
  );
}
