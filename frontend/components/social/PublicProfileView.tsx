'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, UserPlus } from 'lucide-react';
import { socialApi } from '@/lib/api/social';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { TitleCard, TitleCardSkeleton } from '@/components/catalog/TitleCard';
import { formatRelativeDate } from '@/lib/utils';

/**
 * Someone else's public profile: who they are, and what they have shared.
 *
 * Only the `my_list` watchlist is exposed — favourites, watch-later and history
 * stay private, so making a profile public is a bounded disclosure rather than
 * an open door.
 */
export function PublicProfileView({ handle }: { handle: string }) {
  const queryClient = useQueryClient();
  const { activeProfile } = useProfile();

  const profile = useQuery({
    queryKey: ['public-profile', handle, activeProfile?.id],
    queryFn: () => socialApi.profile(handle),
    retry: false,
  });

  const list = useQuery({
    queryKey: ['public-list', handle],
    queryFn: () => socialApi.sharedList(handle),
    enabled: profile.isSuccess,
  });

  const toggleFollow = useMutation({
    mutationFn: ({ profileId, following }: { profileId: string; following: boolean }) =>
      following ? socialApi.unfollow(profileId) : socialApi.follow(profileId),
    onSuccess: async (_result, variables) => {
      toast.success(variables.following ? 'Unfollowed' : 'Following');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['public-profile', handle] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  if (profile.isError) {
    return (
      <div className="px-(--gutter) py-24">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <FormAlert tone="danger">{toApiError(profile.error).message}</FormAlert>
          <Button asChild variant="outline">
            <Link href="/feed">Back to activity</Link>
          </Button>
        </div>
      </div>
    );
  }

  const data = profile.data;

  return (
    <div className="px-(--gutter) py-10">
      <header className="flex flex-wrap items-center gap-5">
        {data ? (
          <ProfileAvatar
            name={data.name}
            avatarKey={data.avatarKey}
            avatarUrl={data.avatarUrl}
            size="lg"
          />
        ) : (
          <div className="skeleton size-28 rounded-2xl" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {data?.name ?? 'Loading…'}
          </h1>
          {data && <p className="text-sm text-fg-subtle">@{data.handle}</p>}

          {data && (
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-fg-muted">
              <span>
                <strong className="text-fg">{data.followerCount}</strong> follower
                {data.followerCount === 1 ? '' : 's'}
              </span>
              <span>
                <strong className="text-fg">{data.followingCount}</strong> following
              </span>
              <span className="text-fg-subtle">Joined {formatRelativeDate(data.joinedAt)}</span>
            </div>
          )}
        </div>

        {/* `isFollowing` is null for anonymous viewers and for your own profile,
            which is exactly when a follow button makes no sense. */}
        {data && data.isFollowing !== null && (
          <Button
            variant={data.isFollowing ? 'outline' : 'accent'}
            isLoading={toggleFollow.isPending}
            onClick={() =>
              toggleFollow.mutate({
                profileId: data.profileId,
                following: Boolean(data.isFollowing),
              })
            }
          >
            {data.isFollowing ? <Check aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
            {data.isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </header>

      <section className="mt-10" aria-labelledby="shared-list">
        <h2 id="shared-list" className="mb-4 text-lg font-bold tracking-tight">
          Shared watchlist
        </h2>

        {list.isLoading ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <TitleCardSkeleton />
              </li>
            ))}
          </ul>
        ) : list.data && list.data.items.length === 0 ? (
          <p className="rounded-panel border border-line py-14 text-center text-sm text-fg-muted">
            {data?.name} has not shared any titles yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {list.data?.items.map((title, index) => (
              <li key={title.id}>
                <TitleCard title={title} priority={index < 6} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
