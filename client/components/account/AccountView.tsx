'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { BadgeCheck, LogOut, MailWarning, Monitor, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { authApi } from '@/lib/api/auth';
import { toApiError } from '@/lib/api-client';
import { formatRelativeTime, initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Logo } from '@/components/brand/Logo';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';

/**
 * Account overview: identity, verification state, password, and active sessions.
 *
 * The session list is the visible counterpart to refresh-token rotation — it is
 * how a user actually notices an unfamiliar device and can revoke it.
 */
export function AccountView() {
  const { user, logout, logoutEverywhere } = useAuth();
  const queryClient = useQueryClient();

  const sessions = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: authApi.sessions,
    staleTime: 30_000,
  });

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(user?.email ?? ''),
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(toApiError(error).message),
  });

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface/50 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-center gap-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-fg-inverse"
            aria-hidden="true"
          >
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{user.name}</h1>
            <p className="truncate text-sm text-fg-muted">{user.email}</p>
          </div>
          {user.role === 'admin' && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Admin
            </span>
          )}
        </div>

        {!user.isEmailVerified && (
          <div className="mt-6">
            <FormAlert tone="info">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <MailWarning className="size-4" aria-hidden="true" />
                  Your email address is not verified yet.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resend.mutate()}
                  isLoading={resend.isPending}
                >
                  Resend link
                </Button>
              </div>
            </FormAlert>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Sign-in methods" description="How you access this account.">
            <ul className="space-y-2">
              {user.authProviders.map((provider) => (
                <li
                  key={provider}
                  className="flex items-center gap-2 rounded-control bg-surface-raised px-3.5 py-2.5 text-sm capitalize"
                >
                  <BadgeCheck className="size-4 text-success" aria-hidden="true" />
                  {provider === 'local' ? 'Email and password' : provider}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-fg-subtle">
              Member since {new Date(user.createdAt).toLocaleDateString()}.
            </p>
          </Panel>

          <Panel
            title="Active sessions"
            description="Devices currently signed in to this account."
          >
            {sessions.isLoading && (
              <div className="space-y-2" aria-hidden="true">
                <div className="skeleton h-14 rounded-control" />
                <div className="skeleton h-14 rounded-control" />
              </div>
            )}

            {sessions.isError && (
              <FormAlert tone="danger">{toApiError(sessions.error).message}</FormAlert>
            )}

            {sessions.data && (
              <>
                <ul className="space-y-2">
                  {sessions.data.sessions.map((session) => (
                    <li
                      key={session.familyId}
                      className="rounded-control bg-surface-raised px-3.5 py-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <Monitor
                          className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 text-sm">
                          <p className="truncate text-fg">
                            {describeUserAgent(session.userAgent)}
                          </p>
                          <p className="text-xs text-fg-subtle">
                            Last active {formatRelativeTime(session.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="outline"
                  block
                  className="mt-4"
                  onClick={async () => {
                    await queryClient.cancelQueries({ queryKey: ['auth', 'sessions'] });
                    await logoutEverywhere();
                  }}
                >
                  Sign out on all devices
                </Button>
              </>
            )}
          </Panel>

          <Panel
            title="Password"
            description="Changing it signs out every other device."
            className="lg:col-span-2"
          >
            <ChangePasswordForm />
          </Panel>
        </div>

        {user.role === 'admin' && (
          <div className="mt-6">
            <Button asChild variant="subtle">
              <Link href="/admin">Open admin dashboard</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-panel border border-line bg-surface p-6 ${className ?? ''}`}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Turns a raw user-agent into something a person can recognise.
 *
 * Deliberately coarse: the goal is "is this me?", and a full UA string is both
 * unreadable and more fingerprinting detail than the page needs to show.
 */
function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';

  const browser =
    /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\//.test(userAgent) ? 'Opera'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : 'Browser';

  const platform =
    /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Android/.test(userAgent) ? 'Android'
    : /Mac OS X/.test(userAgent) ? 'macOS'
    : /Windows/.test(userAgent) ? 'Windows'
    : /Linux/.test(userAgent) ? 'Linux'
    : 'Unknown OS';

  return `${browser} on ${platform}`;
}
