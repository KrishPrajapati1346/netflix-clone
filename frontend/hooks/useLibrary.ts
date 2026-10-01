'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ListKind, MediaType } from '@shared';
import { libraryApi } from '@/lib/api/catalog';
import { toApiError } from '@/lib/api-client';

/**
 * Mutations for a profile's library, with the cache invalidation they imply.
 *
 * Adding to My List changes the title's own viewer state *and* the home feed's
 * "My list" row, so both caches are dropped. Getting this wrong is what makes a
 * UI where you add something and it does not appear until a hard refresh.
 */
export function useLibraryActions() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['home'] }),
      queryClient.invalidateQueries({ queryKey: ['title'] }),
      queryClient.invalidateQueries({ queryKey: ['list'] }),
    ]);
  };

  // The two branches return differently-shaped bodies, and nothing here reads
  // them, so the result type is widened rather than contorting the API client.
  const toggleList = useMutation<unknown, Error, {
    kind: ListKind;
    mediaType: MediaType;
    mediaId: string;
    isMember: boolean;
  }>({
    mutationFn: ({
      kind,
      mediaType,
      mediaId,
      isMember,
    }) =>
      isMember
        ? libraryApi.removeFromList(kind, mediaType, mediaId)
        : libraryApi.addToList(kind, mediaType, mediaId),
    onSuccess: async (_result, variables) => {
      toast.success(variables.isMember ? 'Removed from your list' : 'Added to your list');
      await invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const setReaction = useMutation({
    mutationFn: ({
      mediaType,
      mediaId,
      reaction,
    }: {
      mediaType: MediaType;
      mediaId: string;
      reaction: 'like' | 'dislike' | 'none';
    }) => libraryApi.setReaction(mediaType, mediaId, reaction),
    onSuccess: async (_result, variables) => {
      if (variables.reaction !== 'none') {
        // Reactions feed the recommender, so say what the action bought them.
        toast.success(
          variables.reaction === 'like'
            ? 'Thanks — we will show you more like this'
            : 'Thanks — we will show you less like this',
        );
      }
      await invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return { toggleList, setReaction };
}
