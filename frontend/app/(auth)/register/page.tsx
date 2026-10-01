import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { RedirectIfAuthenticated } from '@/components/auth/RouteGuard';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <AuthShell
        title="Create your account"
        subtitle="Build watchlists, rate what you watch, and host watch parties."
        footer={
          <>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <RegisterForm />
      </AuthShell>
    </RedirectIfAuthenticated>
  );
}
