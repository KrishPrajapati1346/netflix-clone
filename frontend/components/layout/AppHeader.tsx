'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Search, Settings, UserRound, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useProfile } from '@/context/ProfileProvider';
import { Logo } from '@/components/brand/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { JoinPartyDialog } from '@/components/party/JoinPartyDialog';
import { cn, initials } from '@/lib/utils';

const NAV = [
  { href: '/browse', label: 'Home' },
  { href: '/browse/movies', label: 'Films' },
  { href: '/browse/series', label: 'Series' },
  { href: '/my-list', label: 'My list' },
  { href: '/feed', label: 'Activity' },
];

/**
 * Site header.
 *
 * Transparent over the hero and solid once scrolled — the pattern that lets a
 * full-bleed banner run to the top of the viewport without the nav competing
 * with it. The scroll listener is passive so it never blocks scrolling.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { activeProfile, clearProfile } = useProfile();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [joiningParty, setJoiningParty] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /**
   * A route change should never leave the menu hanging open.
   *
   * Derived during render rather than in an effect, so the menu is already
   * closed on the first paint of the new route instead of flashing open.
   */
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300 ease-out-quick',
        scrolled ? 'bg-canvas/95 backdrop-blur-md' : 'bg-gradient-to-b from-black/80 to-transparent',
      )}
    >
      <div className="flex h-16 items-center gap-6 px-(--gutter)">
        <Logo href="/browse" />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-5 text-sm">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-sm transition-colors duration-200',
                      active ? 'font-semibold text-fg' : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => setJoiningParty(true)}
            aria-label="Join a watch party"
            title="Join a watch party"
            className="flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
          >
            <Users className="size-5" aria-hidden="true" />
          </button>

          <NotificationBell />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-control p-1 transition-colors hover:bg-surface-raised"
            >
              <span
                className="flex size-8 items-center justify-center rounded-md bg-accent text-xs font-bold text-fg-inverse"
                aria-hidden="true"
              >
                {activeProfile ? initials(activeProfile.name) : <UserRound className="size-4" />}
              </span>
              <span className="sr-only">
                Account menu{activeProfile ? `, viewing as ${activeProfile.name}` : ''}
              </span>
            </button>

            {menuOpen && (
              <>
                {/* Click-away layer, so the menu closes on any outside click. */}
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-panel border border-line bg-surface-overlay shadow-2xl shadow-black/50"
                >
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-sm font-medium">{activeProfile?.name ?? 'No profile'}</p>
                    <p className="truncate text-xs text-fg-subtle">{user?.email}</p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setJoiningParty(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
                  >
                    <Users className="size-4" aria-hidden="true" />
                    Join a watch party
                  </button>

                  <MenuLink href="/profiles" icon={<UserRound />}>
                    Switch profile
                  </MenuLink>
                  <MenuLink href="/settings" icon={<Settings />}>
                    Settings
                  </MenuLink>
                  <MenuLink href="/account" icon={<Settings />}>
                    Account &amp; security
                  </MenuLink>
                  {user?.role === 'admin' && (
                    <MenuLink href="/admin" icon={<Settings />}>
                      Admin dashboard
                    </MenuLink>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      await clearProfile();
                      await logout();
                    }}
                    className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {joiningParty && <JoinPartyDialog onClose={() => setJoiningParty(false)} />}
    </header>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg [&_svg]:size-4"
    >
      {icon}
      {children}
    </Link>
  );
}
