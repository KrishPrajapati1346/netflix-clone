import type { Metadata } from 'next';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { RequireAdmin } from '@/components/auth/RouteGuard';

export const metadata: Metadata = { title: 'Admin' };

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminOverview />
    </RequireAdmin>
  );
}
