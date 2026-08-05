'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordInput } from '@kinora/shared';
import { useAuth } from '@/context/AuthProvider';
import { authApi } from '@/lib/api/auth';
import { toApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { POST_AUTH_ROUTE } from '@/lib/routes';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { adoptSession } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  // `useWatch` subscribes to just this field, so typing a password does not
  // re-render every other input in the form.
  const password = useWatch({ control, name: 'password' }) ?? '';

  if (!token) {
    return (
      <div className="space-y-5">
        <FormAlert tone="danger">
          This reset link is missing its token. Request a new one to continue.
        </FormAlert>
        <Button asChild block variant="outline">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await authApi.resetPassword(values);
      // The API signs the user straight in — they just proved mailbox control,
      // so bouncing them to a login form would be friction with no benefit.
      await adoptSession(session.accessToken, session.user);
      toast.success('Password updated');
      router.push(POST_AUTH_ROUTE);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.details) {
        for (const [field, messages] of Object.entries(apiError.details)) {
          if (field === 'password' || field === 'confirmPassword' || field === 'token') {
            setError(field as keyof ResetPasswordInput, { message: messages[0] });
          }
        }
      }
      setFormError(apiError.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <FormAlert tone="danger">{formError}</FormAlert>}

      <input type="hidden" {...register('token')} />

      <div>
        <Input
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          label="New password"
          placeholder="At least 10 characters"
          autoComplete="new-password"
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
        <PasswordStrength password={password} />
      </div>

      <Input
        {...register('confirmPassword')}
        type={showPassword ? 'text' : 'password'}
        label="Confirm new password"
        placeholder="Type it again"
        autoComplete="new-password"
        leadingIcon={<Lock />}
        error={errors.confirmPassword?.message}
        disabled={isSubmitting}
      />

      <Button type="submit" block size="lg" isLoading={isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
