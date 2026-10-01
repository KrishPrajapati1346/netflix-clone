import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { RequireAdmin } from '@/components/auth/RouteGuard';

export const metadata: Metadata = { title: 'Admin' };

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}
