'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { changePasswordSchema, type ChangePasswordInput } from '@kinora/shared';
import { useAuth } from '@/context/AuthProvider';
import { authApi } from '@/lib/api/auth';
import { toApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

export function ChangePasswordForm() {
  const { adoptSession, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur',
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  // `useWatch` subscribes to just this field, so typing a password does not
  // re-render every other input in the form.
  const password = useWatch({ control, name: 'password' }) ?? '';

  // An OAuth-only account has no password to change; offering the form would
  // guarantee a confusing failure.
  if (user && !user.authProviders.includes('local')) {
    return (
      <FormAlert tone="info">
        This account signs in through a social provider and has no password. Use “forgot password”
        on the sign-in page to set one.
      </FormAlert>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await authApi.changePassword(values);
      // Every session was revoked, including this one — adopt the replacement
      // pair the API issued so the user is not silently signed out.
      await adoptSession(session.accessToken, session.user);
      reset();
      toast.success('Password updated. Other devices have been signed out.');
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.details) {
        for (const [field, messages] of Object.entries(apiError.details)) {
          if (field === 'currentPassword' || field === 'password' || field === 'confirmPassword') {
            setError(field as keyof ChangePasswordInput, { message: messages[0] });
          }
        }
      }
      setFormError(apiError.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {formError && (
        <div className="sm:col-span-2">
          <FormAlert tone="danger">{formError}</FormAlert>
        </div>
      )}

      <div className="sm:col-span-2">
        <Input
          {...register('currentPassword')}
          type="password"
          label="Current password"
          autoComplete="current-password"
          leadingIcon={<Lock />}
          error={errors.currentPassword?.message}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Input
          {...register('password')}
          type="password"
          label="New password"
          autoComplete="new-password"
          leadingIcon={<Lock />}
          error={errors.password?.message}
          disabled={isSubmitting}
        />
        <PasswordStrength password={password} />
      </div>

      <Input
        {...register('confirmPassword')}
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        leadingIcon={<Lock />}
        error={errors.confirmPassword?.message}
        disabled={isSubmitting}
      />

      <div className="sm:col-span-2">
        <Button type="submit" isLoading={isSubmitting}>
          Update password
        </Button>
      </div>
    </form>
  );
}
