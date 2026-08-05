import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { VerifyEmailPanel } from '@/components/auth/VerifyEmailPanel';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

export const metadata: Metadata = { title: 'Verify your email' };

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Verify your email" subtitle="One quick step to finish setting up your account.">
      <Suspense fallback={<FullPageSpinner label="Loading" className="min-h-[12rem]" />}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthShell>
  );
}
