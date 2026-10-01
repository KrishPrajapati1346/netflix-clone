'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useProfile } from '@/context/ProfileProvider';
import { AppHeader } from '@/components/layout/AppHeader';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

/**
 * Chrome for every signed-in, profile-scoped page.
 *
 * Gates on *two* things, because they fail differently: no session sends you to
 * sign in, no selected profile sends you to the picker. Collapsing them into one
 * check would bounce a perfectly valid session back to the login screen simply
 * because nobody had chosen a profile yet.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeProfile, isLoading: profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!activeProfile) router.replace('/profiles');
  }, [authLoading, profileLoading, isAuthenticated, activeProfile, router]);

  if (authLoading || profileLoading) return <FullPageSpinner label="Loading Kinora" />;
  if (!isAuthenticated) return <FullPageSpinner label="Redirecting to sign in" />;
  if (!activeProfile) return <FullPageSpinner label="Choose a profile" />;

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      {/* `pt-16` clears the fixed header; pages with a hero cancel it with -mt-16. */}
      <main id="main" className="pt-16">
        {children}
      </main>
    </div>
  );
}
