import type { Metadata } from 'next';
import { AccountView } from '@/components/account/AccountView';
import { RequireAuth } from '@/components/auth/RouteGuard';

export const metadata: Metadata = { title: 'Your account' };

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountView />
    </RequireAuth>
  );
}
