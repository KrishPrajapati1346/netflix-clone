'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@kinora/shared';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { toApiError } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [sent, setSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const requestReset = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (data) => {
      setSent(data.message);
      // Without SMTP the API hands back the link so the flow stays completable
      // on a fresh clone. Production never populates this field.
      if (data.devResetUrl) {
        const token = data.devResetUrl.split('token=')[1] ?? '';
        router.push(`/reset-password?token=${encodeURIComponent(token)}`);
      }
    },
  });

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={
        <Link
          href="/login"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <FormAlert tone="success">{sent}</FormAlert>
      ) : (
        <form
          onSubmit={handleSubmit((values) => requestReset.mutate(values))}
          noValidate
          className="space-y-4"
        >
          {requestReset.isError && (
            <FormAlert tone="danger">{toApiError(requestReset.error).message}</FormAlert>
          )}

          <Input
            {...register('email')}
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            leadingIcon={<Mail />}
            error={errors.email?.message}
            disabled={requestReset.isPending}
          />

          <Button type="submit" block size="lg" isLoading={requestReset.isPending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
