'use client';

import { useFeatures } from '@/hooks/useFeatures';
import { API_BASE_URL, API_PREFIX } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

/**
 * Social sign-in buttons, rendered only for providers this deployment can serve.
 *
 * The server reports which OAuth credentials it actually has, so a fresh clone
 * with an empty `.env` shows no social buttons at all rather than buttons that
 * fail on click. That is the whole point of the capability endpoint.
 */
export function SocialSignIn({ label = 'continue' }: { label?: string }) {
  const { features, isLoading } = useFeatures();

  if (isLoading || !features.anyOAuth) return null;

  // A full page navigation, not fetch: the OAuth handshake is a browser
  // redirect flow and must leave the SPA.
  const startOAuth = (provider: 'google' | 'github') => {
    // A full document navigation to the *API* origin, not a Next route: the
    // OAuth handshake is a chain of browser redirects through Google/GitHub and
    // back, so it has to leave the SPA. `router.push` cannot express that.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${API_BASE_URL}${API_PREFIX}/auth/${provider}`;
  };

  return (
    <>
      <div className="relative my-6" role="separator" aria-label={`Or ${label} with a social account`}>
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface px-3 text-xs uppercase tracking-widest text-fg-subtle">
            or {label} with
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {features.googleOAuth && (
          <Button variant="outline" onClick={() => startOAuth('google')} type="button">
            <GoogleMark />
            Google
          </Button>
        )}
        {features.githubOAuth && (
          <Button variant="outline" onClick={() => startOAuth('github')} type="button">
            <GitHubMark />
            GitHub
          </Button>
        )}
      </div>
    </>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.58-5.17 3.58-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58l-.01-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}
