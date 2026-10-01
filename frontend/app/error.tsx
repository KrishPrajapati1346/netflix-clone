'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';

/**
 * Route-level error boundary.
 *
 * Next passes a `digest` for server-side errors and withholds the message in
 * production; showing the digest gives the user something to quote in a bug
 * report without leaking a stack trace.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Where a real deployment would forward to Sentry or similar.
    console.error('Unhandled route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <Logo />
      <div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">
          That page failed to load. Trying again usually sorts it out.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-fg-subtle">
            Reference: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>
        <RotateCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
