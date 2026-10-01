import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { TitleDetail } from '@/components/catalog/TitleDetail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Derived from the slug rather than fetched: the detail request is
  // profile-scoped (maturity filtering, viewer state) and metadata generation
  // has no profile grant, so it would render a different title than the page.
  const readable = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { title: readable };
}

export default async function TitlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <AppShell>
      <TitleDetail slug={slug} />
    </AppShell>
  );
}
