'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Film, ShieldCheck, Tv, UserRound, Users } from 'lucide-react';
import { http, toApiError } from '@/lib/api-client';
import { formatCompact } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Logo } from '@/components/brand/Logo';

interface AdminOverviewData {
  users: { total: number; admins: number; unverified: number };
  profiles: number;
  catalog: { movies: number; shows: number; seasons: number; episodes: number };
  generatedAt: string;
}

/**
 * Admin landing surface.
 *
 * Counts only at this stage — content CRUD and charted analytics arrive in
 * Phase 7. What it does establish now is the full authorization path: an
 * admin-guarded route calling an admin-guarded endpoint.
 */
export function AdminOverview() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => http.get<AdminOverviewData>('/admin/overview'),
  });

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Admin
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account">Back to account</Link>
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Catalog management and analytics land in a later phase. These figures come live from the
          database.
        </p>

        {isError && (
          <div className="mt-6">
            <FormAlert tone="danger">{toApiError(error).message}</FormAlert>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? // Skeletons match the final tile geometry so nothing reflows on load.
              Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="skeleton h-28 rounded-panel" aria-hidden="true" />
              ))
            : data && (
                <>
                  <Stat icon={<Users aria-hidden="true" />} label="Accounts" value={data.users.total} />
                  <Stat icon={<ShieldCheck aria-hidden="true" />} label="Admins" value={data.users.admins} />
                  <Stat
                    icon={<UserRound aria-hidden="true" />}
                    label="Profiles"
                    value={data.profiles}
                  />
                  <Stat icon={<Film aria-hidden="true" />} label="Movies" value={data.catalog.movies} />
                  <Stat icon={<Tv aria-hidden="true" />} label="Series" value={data.catalog.shows} />
                  <Stat
                    icon={<Tv aria-hidden="true" />}
                    label="Episodes"
                    value={data.catalog.episodes}
                  />
                </>
              )}
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <span className="inline-flex size-9 items-center justify-center rounded-control bg-surface-raised text-fg-muted [&_svg]:size-4">
        {icon}
      </span>
      <p className="mt-3 text-2xl font-bold tabular-nums">{formatCompact(value)}</p>
      <p className="text-sm text-fg-muted">{label}</p>
    </div>
  );
}
