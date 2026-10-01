'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Play, Plus, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { TitleDetailDTO, TitleSummaryDTO } from '@shared';
import { artworkUrl, catalogApi } from '@/lib/api/catalog';
import { toApiError } from '@/lib/api-client';
import { useProfile } from '@/context/ProfileProvider';
import { useLibraryActions } from '@/hooks/useLibrary';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { CatalogRow } from './CatalogRow';
import { EpisodeList } from './EpisodeList';
import { RatingStars } from './RatingStars';
import { ReviewSection } from './ReviewSection';
import { StartPartyButton } from '@/components/party/StartPartyButton';
import { cn, formatRuntime } from '@/lib/utils';

export function TitleDetail({ slug }: { slug: string }) {
  const { activeProfile } = useProfile();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['title', slug, activeProfile?.id],
    queryFn: () => catalogApi.title(slug),
  });

  const { data: similar } = useQuery({
    queryKey: ['title', slug, 'similar', activeProfile?.id],
    queryFn: () => catalogApi.similar(slug),
    enabled: Boolean(data),
  });

  if (isLoading) return <TitleDetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="px-(--gutter) py-24">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <FormAlert tone="danger">
            {isError ? toApiError(error).message : 'That title is not in the catalog.'}
          </FormAlert>
          <Button asChild variant="outline">
            <Link href="/browse">Back to browse</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <TitleDetailView title={data} similar={similar?.items ?? []} />;
}

function TitleDetailView({
  title,
  similar,
}: {
  title: TitleDetailDTO;
  similar: TitleSummaryDTO[];
}) {
  const { toggleList, setReaction } = useLibraryActions();

  const inMyList = title.viewerState?.inLists.includes('my_list') ?? false;
  const reaction = title.viewerState?.reaction ?? 'none';
  const progress = title.viewerState?.progress;
  const nextEpisode = title.viewerState?.nextEpisode;

  const watchHref =
    title.mediaType === 'tv' && nextEpisode
      ? `/watch/episode/${nextEpisode.id}`
      : `/watch/movie/${title.id}`;

  const isResuming = Boolean(progress && progress.positionSeconds > 30 && !progress.completed);

  const playLabel =
    title.mediaType === 'tv' && nextEpisode
      ? isResuming
        ? `Resume S${nextEpisode.seasonNumber} E${nextEpisode.episodeNumber}`
        : `Play S${nextEpisode.seasonNumber} E${nextEpisode.episodeNumber}`
      : isResuming
        ? 'Resume'
        : 'Play';

  return (
    <article className="pb-20">
      {/* Banner */}
      <div className="relative -mt-16 h-[62vh] min-h-[26rem] w-full">
        <Image
          src={artworkUrl(title, 'backdrop')}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          unoptimized={!title.backdropUrl}
        />
        <div className="hero-scrim-bottom absolute inset-0" />
        <div className="hero-scrim-left absolute inset-0" />

        <div className="relative flex h-full max-w-3xl flex-col justify-end px-(--gutter) pb-10">
          <h1 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            {title.title}
          </h1>

          {title.tagline && <p className="mt-2 text-base italic text-fg-muted">{title.tagline}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-fg-muted">
            {title.matchScore !== null && (
              <span className="font-semibold text-success">{title.matchScore}% match</span>
            )}
            {title.releaseYear && <span>{title.releaseYear}</span>}
            <span className="rounded-sm border border-line-strong px-1.5 py-px text-xs">
              {title.maturityRating}
            </span>
            {title.mediaType === 'movie' && title.runtimeMinutes ? (
              <span>{formatRuntime(title.runtimeMinutes)}</span>
            ) : (
              title.seasons.length > 0 && (
                <span>
                  {title.seasons.length} season{title.seasons.length === 1 ? '' : 's'}
                </span>
              )
            )}
            {title.ratingCount > 0 && (
              <span>
                ★ {title.averageScore.toFixed(1)}{' '}
                <span className="text-fg-subtle">({title.ratingCount})</span>
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={watchHref}>
                <Play className="fill-current" aria-hidden="true" />
                {playLabel}
              </Link>
            </Button>

            <IconAction
              label={inMyList ? 'Remove from my list' : 'Add to my list'}
              active={inMyList}
              onClick={() =>
                toggleList.mutate({
                  kind: 'my_list',
                  mediaType: title.mediaType,
                  mediaId: title.id,
                  isMember: inMyList,
                })
              }
            >
              {inMyList ? <Check /> : <Plus />}
            </IconAction>

            <IconAction
              label={reaction === 'like' ? 'Remove like' : 'I like this'}
              active={reaction === 'like'}
              onClick={() =>
                setReaction.mutate({
                  mediaType: title.mediaType,
                  mediaId: title.id,
                  reaction: reaction === 'like' ? 'none' : 'like',
                })
              }
            >
              <ThumbsUp />
            </IconAction>

            <IconAction
              label={reaction === 'dislike' ? 'Remove dislike' : 'Not for me'}
              active={reaction === 'dislike'}
              onClick={() =>
                setReaction.mutate({
                  mediaType: title.mediaType,
                  mediaId: title.id,
                  reaction: reaction === 'dislike' ? 'none' : 'dislike',
                })
              }
            >
              <ThumbsDown />
            </IconAction>

            <StartPartyButton
              mediaType={title.mediaType}
              mediaId={title.id}
              // For a series the party needs a concrete episode; the one the
              // viewer would play next is the sensible choice.
              episodeId={nextEpisode?.id ?? null}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-10 px-(--gutter) pt-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <p className="max-w-2xl text-base leading-relaxed text-fg-muted">{title.overview}</p>

          <section aria-labelledby="rate-heading">
            <h2 id="rate-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
              Your rating
            </h2>
            <RatingStars
              mediaType={title.mediaType}
              mediaId={title.id}
              value={title.viewerState?.rating ?? null}
            />
          </section>

          {title.mediaType === 'tv' && title.seasons.length > 0 && (
            <EpisodeList
              showId={title.id}
              seasons={title.seasons}
              initialSeason={nextEpisode?.seasonNumber ?? title.seasons[0]!.seasonNumber}
            />
          )}

          <ReviewSection mediaType={title.mediaType} mediaId={title.id} />
        </div>

        <aside className="space-y-5 text-sm">
          <MetaBlock label="Genres">
            <div className="flex flex-wrap gap-1.5">
              {title.genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/browse?genre=${encodeURIComponent(genre)}`}
                  className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-fg-muted transition-colors hover:text-fg"
                >
                  {genre}
                </Link>
              ))}
            </div>
          </MetaBlock>

          {title.directors.length > 0 && (
            <MetaBlock label={title.directors.length > 1 ? 'Directors' : 'Director'}>
              <p className="text-fg-muted">{title.directors.join(', ')}</p>
            </MetaBlock>
          )}

          {title.cast.length > 0 && (
            <MetaBlock label="Cast">
              <ul className="space-y-1 text-fg-muted">
                {title.cast.slice(0, 8).map((member) => (
                  <li key={`${member.name}-${member.order}`}>
                    {member.name}
                    {member.character && (
                      <span className="text-fg-subtle"> as {member.character}</span>
                    )}
                  </li>
                ))}
              </ul>
            </MetaBlock>
          )}

          {title.keywords.length > 0 && (
            <MetaBlock label="Themes">
              <p className="text-fg-subtle">{title.keywords.join(' · ')}</p>
            </MetaBlock>
          )}

          {title.trailerUrl && (
            <MetaBlock label="Trailer">
              <a
                href={title.trailerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent underline-offset-4 hover:underline"
              >
                Watch the trailer
              </a>
            </MetaBlock>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <div className="mt-12">
          <CatalogRow
            row={{
              key: 'similar',
              title: 'More like this',
              reason:
                'Ranked by shared genres, cast and director with this title, computed in the database',
              items: similar,
            }}
          />
        </div>
      )}
    </article>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{label}</h2>
      {children}
    </div>
  );
}

function IconAction({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex size-12 items-center justify-center rounded-full border-2 transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&_svg]:size-5',
        active
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-line-strong text-fg-muted hover:border-fg-subtle hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function TitleDetailSkeleton() {
  return (
    <div className="pb-20" aria-hidden="true">
      <div className="relative -mt-16 h-[62vh] min-h-[26rem]">
        <div className="skeleton absolute inset-0" />
        <div className="hero-scrim-bottom absolute inset-0" />
        <div className="relative flex h-full max-w-3xl flex-col justify-end gap-4 px-(--gutter) pb-10">
          <div className="skeleton h-12 w-2/3 rounded-sm" />
          <div className="skeleton h-4 w-1/3 rounded-sm" />
          <div className="skeleton h-12 w-40 rounded-control" />
        </div>
      </div>
      <div className="space-y-3 px-(--gutter) pt-8">
        <div className="skeleton h-4 w-full max-w-2xl rounded-sm" />
        <div className="skeleton h-4 w-4/5 max-w-2xl rounded-sm" />
      </div>
    </div>
  );
}
