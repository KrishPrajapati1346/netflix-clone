import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { RedirectIfAuthenticated } from '@/components/auth/RouteGuard';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <AuthShell
        title="Welcome back"
        subtitle="Sign in to pick up where you left off."
        footer={
          <>
            New to Kinora?{' '}
            <Link
              href="/register"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </>
        }
      >
        {/* useSearchParams needs a Suspense boundary in the App Router. */}
        <Suspense fallback={<FullPageSpinner label="Loading" className="min-h-[16rem]" />}>
          <LoginForm />
        </Suspense>
      </AuthShell>
    </RedirectIfAuthenticated>
  );
}
