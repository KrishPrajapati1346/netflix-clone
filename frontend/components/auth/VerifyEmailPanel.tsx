'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { authApi } from '@/lib/api/auth';
import { toApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { POST_AUTH_ROUTE, stashDevVerificationToken, takeDevVerificationToken } from '@/lib/routes';

type Status = 'idle' | 'verifying' | 'verified' | 'failed';

/**
 * Handles both halves of verification: consuming a token from the emailed link,
 * and the "waiting for the email" state with a resend control.
 */
export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // The emailed link carries `?token=`; the no-SMTP development path stashes
  // it in sessionStorage instead so it never appears in the address bar.
  const [token] = useState(() => searchParams.get('token') ?? takeDevVerificationToken());
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState<string | null>(null);

  // React 18+ mounts effects twice in development StrictMode. Verification
  // tokens are single-use, so an unguarded effect would consume the token on
  // the first run and then report "invalid or expired" on the second.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus('verified');
        // Reflect the new verified flag in the header/menus immediately.
        await refreshUser().catch(() => undefined);
        toast.success('Email verified');
        setTimeout(() => router.push(POST_AUTH_ROUTE), 1400);
      } catch (error) {
        setStatus('failed');
        setMessage(toApiError(error).message);
      }
    })();
  }, [token, refreshUser, router]);

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(user?.email ?? ''),
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.devVerificationUrl) {
        stashDevVerificationToken(data.devVerificationUrl.split('token=')[1] ?? '');
        router.refresh();
      }
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center" role="status" aria-live="polite">
        <RefreshCw className="size-7 animate-spin text-accent" aria-hidden="true" />
        <p className="text-sm text-fg-muted">Verifying your email address…</p>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <MailCheck className="size-10 text-success" aria-hidden="true" />
        <div>
          <p className="font-semibold">You&apos;re all set</p>
          <p className="mt-1 text-sm text-fg-muted">
            Taking you to Kinora…
          </p>
        </div>
        <Button asChild block>
          <Link href={POST_AUTH_ROUTE}>Start browsing</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {status === 'failed' && message && <FormAlert tone="danger">{message}</FormAlert>}

      <FormAlert tone="info">
        {user?.email ? (
          <>
            We sent a verification link to <strong>{user.email}</strong>. Open it to activate your
            account.
          </>
        ) : (
          <>Open the verification link we emailed you to activate your account.</>
        )}
      </FormAlert>

      {user?.email && (
        <Button
          variant="outline"
          block
          onClick={() => resend.mutate()}
          isLoading={resend.isPending}
        >
          Resend verification email
        </Button>
      )}

      <p className="text-center text-sm text-fg-muted">
        <Link href={POST_AUTH_ROUTE} className="underline-offset-4 hover:text-fg hover:underline">
          Continue browsing for now
        </Link>
      </p>
    </div>
  );
}
