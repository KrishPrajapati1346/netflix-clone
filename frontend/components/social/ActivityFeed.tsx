'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { socialApi, type ActivityItem } from '@/lib/api/social';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { ShareProfilePanel } from './ShareProfilePanel';
import { formatRelativeDate } from '@/lib/utils';

/** Renders one event as a sentence, rather than a generic "X did something". */
function describe(item: ActivityItem): React.ReactNode {
  const media = item.mediaSlug ? (
    <Link href={`/title/${item.mediaSlug}`} className="font-medium text-fg hover:underline">
      {item.mediaTitle}
    </Link>
  ) : (
    <span className="font-medium text-fg">{item.mediaTitle}</span>
  );

  switch (item.kind) {
    case 'watched':
      return <>finished {media}</>;
    case 'rated':
      return (
        <>
          rated {media} <span className="text-accent">{item.score} ★</span>
        </>
      );
    case 'reviewed':
      return <>reviewed {media}</>;
    case 'listed':
      return <>added {media} to their list</>;
    case 'followed':
      return <>followed {item.targetProfileName}</>;
    default:
      return null;
  }
}

export function ActivityFeed() {
  const queryClient = useQueryClient();
  const { activeProfile } = useProfile();

  const feed = useQuery({
    queryKey: ['feed', activeProfile?.id],
    queryFn: socialApi.feed,
    enabled: Boolean(activeProfile),
  });

  const discover = useQuery({
    queryKey: ['discover', activeProfile?.id],
    queryFn: socialApi.discover,
    enabled: Boolean(activeProfile),
  });

  const follow = useMutation({
    mutationFn: (profileId: string) => socialApi.follow(profileId),
    onSuccess: async () => {
      toast.success('Following');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['discover'] }),
      ]);
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <div className="grid gap-10 px-(--gutter) py-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section aria-labelledby="feed-heading">
        <h1 id="feed-heading" className="mb-5 text-2xl font-bold tracking-tight sm:text-3xl">
          Activity
        </h1>

        {feed.isLoading ? (
          <ul className="space-y-2">
            {[0, 1, 2].map((index) => (
              <li key={index} className="skeleton h-16 rounded-panel" aria-hidden="true" />
            ))}
          </ul>
        ) : feed.data && feed.data.items.length === 0 ? (
          <div className="rounded-panel border border-line py-16 text-center">
            <p className="text-lg font-semibold">Your feed is quiet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
              Follow a few people and what they watch, rate and review shows up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {feed.data?.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-panel border border-line p-3"
              >
                <ProfileAvatar name={item.actor.name} avatarKey={item.actor.avatarKey} size="sm" />
                <p className="min-w-0 flex-1 text-sm text-fg-muted">
                  {item.actor.handle ? (
                    <Link href={`/u/${item.actor.handle}`} className="font-semibold text-fg hover:underline">
                      {item.actor.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-fg">{item.actor.name}</span>
                  )}{' '}
                  {describe(item)}
                </p>
                <time className="shrink-0 text-xs text-fg-subtle" dateTime={item.createdAt}>
                  {formatRelativeDate(item.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="space-y-8">
        <ShareProfilePanel />

        <section aria-labelledby="discover-heading">
          <h2 id="discover-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
            People to follow
          </h2>

          {discover.data && discover.data.items.length > 0 ? (
            <ul className="space-y-2">
              {discover.data.items.map((person) => (
                <li key={person.profileId} className="flex items-center gap-3">
                  <ProfileAvatar name={person.name} avatarKey={person.avatarKey} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${person.handle}`} className="block truncate text-sm font-medium hover:underline">
                      {person.name}
                    </Link>
                    <p className="truncate text-xs text-fg-subtle">@{person.handle}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => follow.mutate(person.profileId)}>
                    <UserPlus aria-hidden="true" />
                    Follow
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-subtle">
              Nobody else has made a profile public yet.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
