'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Search, ShieldCheck } from 'lucide-react';
import type { UserRole } from '@shared';
import { adminApi } from '@/lib/api/admin';
import { toApiError } from '@/lib/api-client';
import { useAuth } from '@/context/AuthProvider';
import { useDebounced } from '@/hooks/useDebounced';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { formatRelativeDate } from '@/lib/utils';

export function UsersPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 250);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: () => adminApi.users(page, debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => adminApi.setRole(id, role),
    onSuccess: async () => {
      toast.success('Role updated — their other sessions were signed out');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by name or email"
          aria-label="Filter users"
          className="h-10 w-full rounded-control border border-line bg-surface pl-9 pr-3 text-sm"
        />
      </div>

      {isError && <FormAlert tone="danger">{toApiError(error).message}</FormAlert>}

      <div className="overflow-x-auto rounded-panel border border-line">
        <table className="w-full min-w-3xl text-sm">
          <caption className="sr-only">Registered accounts</caption>
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-fg-subtle">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Account</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Profiles</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Verified</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Last seen</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Role</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {isLoading
              ? Array.from({ length: 8 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="skeleton h-5 rounded-sm" aria-hidden="true" />
                    </td>
                  </tr>
                ))
              : data?.items.map((row) => {
                  const isSelf = row.id === user?.id;

                  return (
                    <tr key={row.id} className="hover:bg-surface-raised/60">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-fg-subtle">{row.email}</p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-fg-muted">{row.profileCount}</td>
                      <td className="px-3 py-2.5">
                        {row.isEmailVerified ? (
                          <span className="text-success">Yes</span>
                        ) : (
                          <span className="text-fg-subtle">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted">
                        {row.lastLoginAt ? formatRelativeDate(row.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-3 py-2.5">
                        {isSelf ? (
                          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
                            <ShieldCheck className="size-3.5" aria-hidden="true" />
                            You
                          </span>
                        ) : (
                          <select
                            value={row.role}
                            onChange={(event) =>
                              setRole.mutate({ id: row.id, role: event.target.value as UserRole })
                            }
                            aria-label={`Role for ${row.email}`}
                            className="h-8 rounded-control border border-line bg-surface px-2 text-xs"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="User pagination">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-fg-muted" aria-live="polite">
            Page {data.page} of {data.totalPages} · {data.total} accounts
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
