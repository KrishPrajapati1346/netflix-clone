'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { socialApi } from '@/lib/api/social';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';

/**
 * Opt into (or out of) being publicly discoverable.
 *
 * Private is the default and turning it off is one click, because the honest
 * framing of this feature is "publish some of your activity" — not "complete
 * your profile". Kids profiles cannot opt in at all; the server enforces that
 * too, this is just the matching UI.
 */
export function ShareProfilePanel() {
  const { activeProfile, refreshProfile } = useProfile();
  const [handle, setHandle] = useState(activeProfile?.handle ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: ({ value, isPublic }: { value: string | null; isPublic: boolean }) =>
      socialApi.setHandle(value, isPublic),
    onSuccess: async (_result, variables) => {
      toast.success(variables.isPublic ? 'Your profile is now public' : 'Your profile is private');
      await refreshProfile();
    },
    onError: (err) => setError(toApiError(err).message),
  });

  if (activeProfile?.isKids) {
    return (
      <section className="rounded-panel border border-line p-4">
        <h2 className="text-sm font-semibold">Public profile</h2>
        <p className="mt-1 text-xs text-fg-muted">
          Kids profiles stay private and cannot be shared.
        </p>
      </section>
    );
  }

  const isPublic = activeProfile?.isPublic ?? false;

  return (
    <section className="rounded-panel border border-line p-4">
      <h2 className="text-sm font-semibold">Your public profile</h2>

      {isPublic && activeProfile?.handle ? (
        <>
          <p className="mt-1 text-xs text-fg-muted">
            People can find you at{' '}
            <Link href={`/u/${activeProfile.handle}`} className="text-accent hover:underline">
              /u/{activeProfile.handle}
            </Link>
            . Only your My List watchlist is shared.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            isLoading={save.isPending}
            onClick={() => save.mutate({ value: activeProfile.handle, isPublic: false })}
          >
            Make private
          </Button>
        </>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            save.mutate({ value: handle.trim() || null, isPublic: true });
          }}
        >
          {error && <FormAlert tone="danger">{error}</FormAlert>}

          <Input
            label="Choose a handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
            maxLength={24}
            placeholder="sam"
            hint="3–24 characters. Your list and activity become visible to others."
          />

          <Button type="submit" size="sm" isLoading={save.isPending} disabled={handle.trim().length < 3}>
            Make profile public
          </Button>
        </form>
      )}
    </section>
  );
}
