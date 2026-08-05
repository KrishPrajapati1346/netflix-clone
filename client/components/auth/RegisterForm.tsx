'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@kinora/shared';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/components/ui/form-alert';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { SocialSignIn } from '@/components/auth/SocialSignIn';
import type { ApiRequestError } from '@/lib/api-client';
import { postAuthRoute, stashDevVerificationToken } from '@/lib/routes';

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    // Validate as the user corrects a field rather than only on submit, so the
    // strength meter and the error text agree in real time.
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  // `useWatch` subscribes to just this field, so typing a password does not
  // re-render every other input in the form.
  const password = useWatch({ control, name: 'password' }) ?? '';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await registerUser(values);
      toast.success('Account created — check your email to verify it');

      /**
       * When SMTP is not configured the API returns the verification link
       * directly (development only). Passing it along means a reviewer running
       * a fresh clone can complete the flow without setting up a mail provider.
       */
      const devUrl = session.devVerificationUrl;
      if (devUrl) stashDevVerificationToken(devUrl.split('token=')[1] ?? '');

      router.replace(postAuthRoute(session.user));
    } catch (error) {
      const apiError = error as ApiRequestError;

      if (apiError.details) {
        for (const [field, messages] of Object.entries(apiError.details)) {
          if (
            field === 'name' ||
            field === 'email' ||
            field === 'password' ||
            field === 'confirmPassword'
          ) {
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
        {formError && <FormAlert tone="danger">{formError}</FormAlert>}

        <Input
          {...register('name')}
          label="Name"
          placeholder="Ada Lovelace"
          autoComplete="name"
          leadingIcon={<User />}
          error={errors.name?.message}
          disabled={isSubmitting}
        />

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

        <div>
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Password"
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
          label="Confirm password"
          placeholder="Type it again"
          autoComplete="new-password"
          leadingIcon={<Lock />}
          error={errors.confirmPassword?.message}
          disabled={isSubmitting}
        />

        <Button type="submit" block size="lg" isLoading={isSubmitting}>
          Create account
        </Button>

        <p className="text-center text-xs leading-relaxed text-fg-subtle">
          Kinora is a portfolio demonstration project. It is not affiliated with any commercial
          streaming service.
        </p>
      </form>

      <SocialSignIn label="sign up" />
    </>
  );
}
