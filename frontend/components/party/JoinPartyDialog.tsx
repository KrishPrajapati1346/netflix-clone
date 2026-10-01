'use client';

import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Users } from 'lucide-react';
import { partyApi } from '@/lib/api/party';
import { toApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';

const CODE_LENGTH = 6;

/**
 * Join an existing watch party by code.
 *
 * The party is looked up *before* navigating, so a wrong code produces an
 * inline "no active party with that code" rather than dumping the viewer into
 * a room that then fails to load. It also lets the dialog confirm what they are
 * about to join.
 */
export function JoinPartyDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const join = useMutation({
    mutationFn: () => partyApi.get(code),
    onSuccess: ({ party }) => router.push(`/party/${party.code}`),
    onError: (err) => setError(toApiError(err).message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-party-heading"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-sm rounded-panel border border-line bg-surface p-7"
      >
        <div className="mb-1 flex items-center gap-2">
          <Users className="size-5 text-accent" aria-hidden="true" />
          <h2 id="join-party-heading" className="text-lg font-bold">
            Join a watch party
          </h2>
        </div>
        <p className="text-sm text-fg-muted">
          Enter the {CODE_LENGTH}-character code the host shared with you.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            join.mutate();
          }}
        >
          {error && <FormAlert tone="danger">{error}</FormAlert>}

          <label className="block">
            <span className="sr-only">Party code</span>
            <input
              value={code}
              onChange={(event) => {
                // Codes are generated from an unambiguous uppercase alphabet,
                // so normalise as they type rather than rejecting afterwards.
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, CODE_LENGTH),
                );
                setError(null);
              }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="ABC123"
              aria-label="Party code"
              className="h-14 w-full rounded-control border border-line bg-surface-raised text-center font-mono text-2xl uppercase tracking-[0.4em] outline-none transition-colors focus:border-accent"
            />
          </label>

          <div className="flex gap-3">
            <Button type="button" variant="outline" block onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              block
              isLoading={join.isPending}
              disabled={code.length < CODE_LENGTH}
            >
              Join
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
