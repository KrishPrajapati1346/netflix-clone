'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { postAuthRoute } from '@/lib/routes';

/**
 * Client-side route guards.
 *
 * These are a *user-experience* mechanism, not a security boundary. A
 * determined visitor can render any client component they like; what actually
 * protects data is `requireAuth` / `requireAdmin` on the API, which is why
 * every protected endpoint carries them independently. This layer exists so a
 * signed-out user sees the login page instead of an empty dashboard flashing
 * before its data requests fail.
 */

export function RequireAuth({
  children,
  requireVerified = false,
}: {
  children: ReactNode;
  requireVerified?: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Preserve the destination so login can return the user to it.
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (requireVerified && user && !user.isEmailVerified) {
      router.replace('/verify-email');
    }
  }, [isAuthenticated, isLoading, requireVerified, user, router, pathname]);

  // Rendering children before the session restore settles would flash protected
  // chrome for a signed-out visitor.
  if (isLoading) return <FullPageSpinner label="Checking your session" />;
  if (!isAuthenticated) return <FullPageSpinner label="Redirecting to sign in" />;
  if (requireVerified && user && !user.isEmailVerified) {
    return <FullPageSpinner label="Verification required" />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=%2Fadmin');
      return;
    }
    // A non-admin gets 404 rather than 403: revealing that /admin exists and is
    // merely forbidden is more information than it needs to give.
    if (!isAdmin) router.replace('/not-found');
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading) return <FullPageSpinner label="Checking permissions" />;
  if (!isAuthenticated || !isAdmin) return <FullPageSpinner label="Redirecting" />;

  return <>{children}</>;
}

/**
 * Keeps already-signed-in visitors off the login and register pages.
 *
 * The decision is made *once*, on arrival — deliberately not on every change to
 * `isAuthenticated`. Reacting to the transition would break the pages this
 * guard wraps: registering sets the user and then navigates to email
 * verification, and a guard watching `isAuthenticated` would fire its own
 * redirect the instant the session appeared, cancelling that navigation and
 * silently skipping verification. "Were you already signed in when you got
 * here?" is the question this component is actually meant to answer.
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(postAuthRoute(user));
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) return <FullPageSpinner label="Loading" />;
  if (isAuthenticated) return <FullPageSpinner label="Taking you to Kinora" />;

  return <>{children}</>;
}
