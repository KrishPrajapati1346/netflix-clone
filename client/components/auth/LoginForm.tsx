'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { loginSchema, type LoginInput } from '@kinora/shared';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SocialSignIn } from '@/components/auth/SocialSignIn';
import { FormAlert } from '@/components/ui/form-alert';
import type { ApiRequestError } from '@/lib/api-client';
import { POST_AUTH_ROUTE } from '@/lib/routes';

/**
 * Sign-in form.
 *
 * The Zod schema is imported from the shared package — the same object the API
 * validates against — so client and server can never disagree about what counts
 * as valid input.
 */
export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // OAuth failures come back as a query param on the redirect. Derived during
  // render rather than copied into state by an effect: it is a pure function of
  // the URL, and mirroring it into state would only add a cascading render.
  const oauthError =
    searchParams.get('error') === 'oauth_failed'
      ? 'That social sign-in did not complete. Please try again.'
      : null;
  const displayError = formError ?? oauthError;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      toast.success('Signed in');

      /**
       * Only follow `?next=` when it is a same-origin *path*. Redirecting to an
       * arbitrary attacker-supplied URL after login is an open-redirect, and a
       * convincing one — the user has just authenticated and trusts the flow.
       */
      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : POST_AUTH_ROUTE;
      router.push(safeNext);
    } catch (error) {
      const apiError = error as ApiRequestError;

      if (apiError.details) {
        for (const [field, messages] of Object.entries(apiError.details)) {
          if (field === 'email' || field === 'password') {
            setError(field, { message: messages[0] });
          }
        }
      }
      setFormError(apiError.message);
    }
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {displayError && <FormAlert tone="danger">{displayError}</FormAlert>}

        <Input
          {...register('email')}
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          leadingIcon={<Mail />}
          error={errors.email?.message}
          disabled={isSubmitting}
        />

        <Input
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="Your password"
          autoComplete="current-password"
          leadingIcon={<Lock />}
          error={errors.password?.message}
          disabled={isSubmitting}
          trailingSlot={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          }
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" block size="lg" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <SocialSignIn label="sign in" />
    </>
  );
}
