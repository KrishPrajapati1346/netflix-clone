'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BarChart3, Film, MessageSquareWarning, Users } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/context/AuthProvider';
import { AnalyticsPanel } from './AnalyticsPanel';
import { CatalogPanel } from './CatalogPanel';
import { ModerationPanel } from './ModerationPanel';
import { UsersPanel } from './UsersPanel';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'catalog', label: 'Catalog', icon: Film },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'moderation', label: 'Moderation', icon: MessageSquareWarning },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * Admin shell.
 *
 * Deliberately not wrapped in `AppShell`: the admin panel has no profile
 * context, no hero and no viewer chrome, and reusing the viewer header here
 * would imply the two are the same product surface.
 *
 * The route is gated by `RequireAdmin` on the client, but that is convenience
 * only — every endpoint behind it re-checks the role server-side.
 */
export function AdminDashboard() {
  const [tab, setTab] = useState<TabId>('analytics');
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line">
        <div className="flex h-16 items-center gap-4 px-(--gutter)">
          <Logo href="/browse" />
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
            Admin
          </span>

          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="hidden text-fg-subtle sm:inline">{user?.email}</span>
            <Link href="/browse" className="text-fg-muted transition-colors hover:text-fg">
              Back to Kinora
            </Link>
          </div>
        </div>

        <nav aria-label="Admin sections" className="px-(--gutter)">
          <ul role="tablist" className="flex gap-1 overflow-x-auto">
            {TABS.map((entry) => {
              const Icon = entry.icon;
              const active = tab === entry.id;

              return (
                <li key={entry.id}>
                  <button
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-controls={`panel-${entry.id}`}
                    onClick={() => setTab(entry.id)}
                    className={cn(
                      '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors',
                      active
                        ? 'border-accent font-semibold text-fg'
                        : 'border-transparent text-fg-muted hover:text-fg',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {entry.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main id="main" className="px-(--gutter) py-8">
        <div role="tabpanel" id={`panel-${tab}`}>
          {tab === 'analytics' && <AnalyticsPanel />}
          {tab === 'catalog' && <CatalogPanel />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'moderation' && <ModerationPanel />}
        </div>
      </main>
    </div>
  );
}
