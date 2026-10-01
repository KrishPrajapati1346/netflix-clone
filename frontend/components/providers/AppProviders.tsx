'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthProvider';
import { ProfileProvider } from '@/context/ProfileProvider';
import { toApiError } from '@/lib/api-client';

/**
 * Client-side provider stack.
 *
 * The QueryClient is created inside state rather than at module scope: a
 * module-level client would be shared across every request in the Node server
 * process, leaking one user's cached data into another's render.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Catalog data changes rarely; a minute of staleness avoids
            // refetching an entire home page on every tab focus.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const apiError = toApiError(error);
              // Retrying a 4xx just repeats the same rejection. Only transient
              // failures (network, 5xx) are worth a second attempt.
              const status = apiError.status ?? 0;
              if (status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Nested inside AuthProvider: the active profile is only meaningful
            for a signed-in account, and resets whenever that account changes. */}
        <ProfileProvider>{children}</ProfileProvider>
        <Toaster
          position="bottom-right"
          // Match the app's surfaces rather than sonner's defaults, which are
          // light-themed and jarring against a near-black page.
          toastOptions={{
            style: {
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-line)',
              color: 'var(--color-fg)',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
