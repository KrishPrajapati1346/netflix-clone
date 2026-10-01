'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import type { MediaType } from '@shared';
import { partyApi } from '@/lib/api/party';
import { toApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * Starts a watch party for this title and drops the host into the room.
 *
 * Disabled for a series until an episode is known — a party has to point at
 * something playable, and "the show in general" is not.
 */
export function StartPartyButton({
  mediaType,
  mediaId,
  episodeId,
}: {
  mediaType: MediaType;
  mediaId: string;
  episodeId?: string | null;
}) {
  const router = useRouter();

  const start = useMutation({
    mutationFn: () =>
      partyApi.create({
        mediaType,
        mediaId,
        ...(episodeId ? { episodeId } : {}),
        hostControlsOnly: true,
      }),
    onSuccess: ({ party }) => {
      toast.success(`Party ${party.code} started — share the code to invite people`);
      router.push(`/party/${party.code}`);
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const unavailable = mediaType === 'tv' && !episodeId;

  return (
    <button
      type="button"
      onClick={() => start.mutate()}
      disabled={unavailable || start.isPending}
      aria-label="Start a watch party"
      title={unavailable ? 'Pick an episode first' : 'Start a watch party'}
      className={cn(
        'flex size-12 items-center justify-center rounded-full border-2 border-line-strong text-fg-muted transition-colors duration-200',
        'hover:border-fg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      <Users className="size-5" aria-hidden="true" />
    </button>
  );
}
