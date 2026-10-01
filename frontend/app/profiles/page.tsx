import type { Metadata } from 'next';
import { ProfilePicker } from '@/components/profiles/ProfilePicker';
import { RequireAuth } from '@/components/auth/RouteGuard';

export const metadata: Metadata = { title: "Who's watching?" };

export default function ProfilesPage() {
  return (
    <RequireAuth>
      <ProfilePicker />
    </RequireAuth>
  );
}
