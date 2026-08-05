'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthProvider';
import { AuthShell } from '@/components/auth/AuthShell';
import { FormAlert } from '@/components/ui/form-alert';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { postAuthRoute } from '@/lib/routes';

/**
 * Landing page for the OAuth redirect.
 *
 * The API returns the access token in the URL *fragment* rather than the query
 * string, because fragments are never sent to a server — so the token cannot
 * end up in access logs, proxy logs, or a Referer header on the next
 * navigation. This component reads it, hands it to the auth context, and
 * immediately rewrites the URL to strip it from browser history.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { adoptSession, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const token = fragment.get('token');

      // Remove the token from the address bar and from history before anything
      // else runs, so a shared screenshot or a back button cannot leak it.
      window.history.replaceState(null, '', window.location.pathname);

      if (!token) {
        setError('That sign-in did not complete. Please try again.');
        return;
      }

      try {
        await adoptSession(token);
        toast.success('Signed in');
        router.replace(postAuthRoute(user));
      } catch {
        setError('We could not finish signing you in. Please try again.');
      }
    })();
  }, [adoptSession, router, user]);

  if (error) {
    return (
      <AuthShell title="Sign-in failed">
        <div className="space-y-5">
          <FormAlert tone="danger">{error}</FormAlert>
          <a
            href="/login"
            className="block text-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            Back to sign in
          </a>
        </div>
      </AuthShell>
    );
  }

  return <FullPageSpinner label="Finishing sign-in" />;
}
