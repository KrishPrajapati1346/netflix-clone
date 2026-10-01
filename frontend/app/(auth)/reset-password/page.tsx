import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you haven't used before. Signing in elsewhere will be required again."
    >
      <Suspense fallback={<FullPageSpinner label="Loading" className="min-h-[14rem]" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
