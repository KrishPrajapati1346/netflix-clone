import type { TitleDetailDTO, ViewerTitleStateDTO } from '@shared';
import type { ProfileDocument } from '../models/Profile';
import { Rating } from '../models/Rating';
import { getSeasons, toSummary, type ResolvedTitle } from './catalog.service';
import { getListMembership, getReaction } from './list.service';
import { getProgressFor, resolveNextEpisode } from './progress.service';

/**
 * Builds the full detail payload for a title, including viewer-specific state.
 *
 * Kept in its own module because both the detail endpoint and the home hero
 * need it, and putting it in `catalog.service` would have made that module
 * depend on lists and progress — turning a read-only catalog layer into a
 * dependency hub, and creating an import cycle with `feed.service`.
 */
export async function buildTitleDetail(
  resolved: ResolvedTitle,
  profile?: ProfileDocument | null,
): Promise<TitleDetailDTO> {
  const doc = resolved.doc;
  const summary = toSummary(doc as never);

  const seasons = resolved.mediaType === 'tv' ? await getSeasons(doc._id) : [];
  const viewerState = profile ? await buildViewerState(resolved, profile) : null;

  return {
    ...summary,
    tagline: (doc.tagline as string | null) ?? null,
    trailerUrl: (doc.trailerUrl as string | null) ?? null,
    cast: (doc.cast ?? []) as TitleDetailDTO['cast'],
    directors: (doc.directors ?? []) as string[],
    keywords: (doc.keywords ?? []) as string[],
    isFeatured: Boolean(doc.isFeatured),
    releaseDate: doc.releaseDate ? new Date(doc.releaseDate).toISOString() : null,
    // Movies carry playable sources inline; for a series they live on episodes.
    sources: resolved.mediaType === 'movie' ? ((doc.sources ?? []) as TitleDetailDTO['sources']) : [],
    subtitles:
      resolved.mediaType === 'movie' ? ((doc.subtitles ?? []) as TitleDetailDTO['subtitles']) : [],
    chapters:
      resolved.mediaType === 'movie' ? ((doc.chapters ?? []) as TitleDetailDTO['chapters']) : [],
    seasons,
    showStatus: resolved.mediaType === 'tv' ? ((doc.status as never) ?? null) : null,
    viewerState,
  };
}

async function buildViewerState(
  resolved: ResolvedTitle,
  profile: ProfileDocument,
): Promise<ViewerTitleStateDTO> {
  const mediaId = resolved.doc._id;

  // Independent lookups, so one round trip rather than five sequential ones.
  const [inLists, reaction, rating, progress, next] = await Promise.all([
    getListMembership(profile._id, mediaId),
    getReaction(profile._id, mediaId),
    Rating.findOne({ profileId: profile._id, mediaId }).select('score').lean(),
    resolved.mediaType === 'movie'
      ? getProgressFor(profile._id, 'movie', mediaId, null)
      : Promise.resolve(null),
    resolved.mediaType === 'tv' ? resolveNextEpisode(profile._id, mediaId) : Promise.resolve(null),
  ]);

  return {
    inLists,
    reaction,
    rating: rating?.score ?? null,
    // For a series the resume point belongs to an episode, not the show itself.
    progress: resolved.mediaType === 'movie' ? progress : (next?.progress ?? null),
    nextEpisode: next?.episode ?? null,
  };
}
