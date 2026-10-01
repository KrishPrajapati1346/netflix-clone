import { type Types } from 'mongoose';
import {
  GENRES,
  type CatalogRowDTO,
  type Genre,
  type HomeFeedDTO,
  type TitleSummaryDTO,
} from '@shared';
import { Movie } from '../models/Movie';
import type { ProfileDocument } from '../models/Profile';
import { TVShow } from '../models/TVShow';
import { browseCatalog, toSummary } from './catalog.service';
import { getContinueWatching } from './progress.service';
import {
  buildTasteVector,
  collaborativeRecommendations,
  contentBasedRecommendations,
  isColdStart,
  popularTitles,
} from './recommendation.service';
import { getListedIds } from './list.service';

/**
 * Assembles the home page.
 *
 * Two things make this more than a list of queries:
 *
 *  - **Rows are earned, not fixed.** A row is dropped entirely if it has too
 *    few titles to look intentional, so a new profile sees a short, confident
 *    page rather than five rows of three items.
 *  - **Recommendation rows do not repeat titles.** Without de-duplication the
 *    same handful of popular titles fills every row, which is what makes a
 *    naive clone feel empty even with a full catalog. Genre and catalog rows
 *    opt out — see `pushRow`.
 */

const MIN_ROW_SIZE = 4;
const ROW_SIZE = 20;

export async function buildHomeFeed(profile: ProfileDocument): Promise<HomeFeedDTO> {
  const taste = await buildTasteVector(profile);
  const rows: CatalogRowDTO[] = [];

  // Titles already placed on the page, so later rows do not echo earlier ones.
  const used = new Set<string>();

  /**
   * Adds a row, optionally claiming its titles so later rows skip them.
   *
   * De-duplication applies to the *recommendation* band only — "Picked for
   * you", "Viewers like you", "Trending". Those rows compete to answer the same
   * question ("what should I watch?"), and repeating a title across them wastes
   * the slot.
   *
   * Genre and catalog rows opt out (`claim: false`). They answer a different
   * question — "what horror do you have?" — where omitting a title because it
   * appeared in a recommendation above is simply a wrong answer. It also keeps
   * the page from thinning out on a small catalog, where strict global
   * de-duplication exhausts the library after two rows.
   */
  const pushRow = (
    key: string,
    title: string,
    items: TitleSummaryDTO[],
    { reason = null, claim = true }: { reason?: string | null; claim?: boolean } = {},
  ): void => {
    const fresh = claim ? items.filter((item) => !used.has(item.id)) : items;
    if (fresh.length < MIN_ROW_SIZE) return;

    if (claim) for (const item of fresh) used.add(item.id);
    rows.push({ key, title, reason, items: fresh });
  };

  const [continueWatching, listedIds] = await Promise.all([
    getContinueWatching(profile, 20),
    getListedIds(profile._id, 'my_list'),
  ]);

  // Continue Watching is exempt from de-duplication: a half-finished title
  // belongs here even if it would also qualify elsewhere, and it is pushed
  // first so it claims those titles.
  if (continueWatching.length > 0) {
    rows.push({
      key: 'continue',
      title: 'Continue watching',
      reason: null,
      items: continueWatching.map((entry) => entry.title),
    });
    for (const entry of continueWatching) used.add(entry.title.id);
  }

  if (listedIds.length > 0) {
    const myList = await titlesByIds(listedIds, profile);
    pushRow('my_list', 'My list', myList);
  }

  if (isColdStart(taste)) {
    // Nothing to personalise from yet. Say so honestly through the row titles
    // rather than labelling a popularity list "Picked for you".
    const trending = await popularTitles(profile, ROW_SIZE, used);
    pushRow('trending', 'Trending now', trending);

    const topRated = await browseCatalog(
      { ...defaultQuery(), sort: 'rating', minScore: 3.5 },
      profile,
    );
    pushRow('top_rated', 'Top rated', topRated.items, { claim: false });

    const newest = await browseCatalog({ ...defaultQuery(), sort: 'releaseDate' }, profile);
    pushRow('new_releases', 'Recently released', newest.items, { claim: false });
  } else {
    const [forYou, becauseOthers] = await Promise.all([
      contentBasedRecommendations(profile, taste, ROW_SIZE),
      collaborativeRecommendations(profile, taste, ROW_SIZE),
    ]);

    pushRow('for_you', `Picked for ${profile.name}`, forYou, {
      reason: 'Based on the genres, cast and directors of what you have watched and rated',
    });

    pushRow('collaborative', 'Viewers like you enjoyed', becauseOthers, {
      reason: 'Highly rated by profiles whose ratings overlap with yours',
    });

    const trending = await popularTitles(profile, ROW_SIZE, used);
    pushRow('trending', 'Trending now', trending);

    const topRated = await browseCatalog(
      { ...defaultQuery(), sort: 'rating', minScore: 3.5 },
      profile,
    );
    pushRow('top_rated', 'Top rated', topRated.items, { claim: false });

    const newest = await browseCatalog({ ...defaultQuery(), sort: 'releaseDate' }, profile);
    pushRow('new_releases', 'Recently released', newest.items, { claim: false });
  }

  // Genre rows, ordered by this profile's affinity so the most relevant genre
  // appears first rather than alphabetically.
  const genreOrder = rankGenres(taste.weights);
  for (const genre of genreOrder.slice(0, 6)) {
    const page = await browseCatalog({ ...defaultQuery(), genre: [genre] }, profile);
    pushRow(`genre_${genre.toLowerCase().replace(/\s+/g, '_')}`, genre, page.items, {
      claim: false,
    });
  }

  const hero = await pickHero(profile, rows);

  return { hero, rows };
}

function defaultQuery() {
  return {
    page: 1,
    limit: ROW_SIZE,
    sort: 'popularity' as const,
    order: 'desc' as const,
  };
}

/** Genres ordered by affinity, with the rest appended so rows never run out. */
function rankGenres(weights: number[]): Genre[] {
  const scored = GENRES.map((genre, index) => ({ genre, weight: weights[index] ?? 0 }));
  scored.sort((a, b) => b.weight - a.weight);
  return scored.map((entry) => entry.genre);
}

async function titlesByIds(
  ids: Types.ObjectId[],
  profile: ProfileDocument,
): Promise<TitleSummaryDTO[]> {
  if (ids.length === 0) return [];
  const allowed = profile.allowedRatings();

  const [movies, shows] = await Promise.all([
    Movie.find({ _id: { $in: ids }, isPublished: true, maturityRating: { $in: allowed } }).lean(),
    TVShow.find({ _id: { $in: ids }, isPublished: true, maturityRating: { $in: allowed } }).lean(),
  ]);

  return [
    ...movies.map((m) => toSummary({ ...m, mediaType: 'movie' } as never)),
    ...shows.map((s) =>
      toSummary({
        ...s,
        mediaType: 'tv',
        releaseDate: s.firstAirDate ?? null,
        runtimeMinutes: s.averageRuntimeMinutes || null,
      } as never),
    ),
  ];
}

/**
 * Chooses the hero banner.
 *
 * Prefers an editorially featured title, because the admin flagging something
 * should actually surface it. Otherwise takes the strongest recommendation the
 * feed produced, so the hero reflects the same personalisation as the rows.
 */
async function pickHero(
  profile: ProfileDocument,
  rows: CatalogRowDTO[],
): Promise<HomeFeedDTO['hero']> {
  const allowed = profile.allowedRatings();

  // Deliberately no `backdropUrl: { $ne: null }` filter. Titles without stored
  // artwork fall back to the generated backdrop route, so requiring a stored URL
  // here would leave the hero empty on a fresh seed — where every title has
  // generated art and none has a stored one.
  const featured = await Movie.findOne({
    isPublished: true,
    isFeatured: true,
    maturityRating: { $in: allowed },
  })
    .sort({ popularity: -1 })
    .lean();

  const featuredShow = featured
    ? null
    : await TVShow.findOne({
        isPublished: true,
        isFeatured: true,
        maturityRating: { $in: allowed },
      })
        .sort({ popularity: -1 })
        .lean();

  if (featured || featuredShow) {
    const { buildTitleDetail } = await import('./title-detail.service');
    return buildTitleDetail(
      featured
        ? { mediaType: 'movie', doc: { ...featured, mediaType: 'movie' } as never }
        : {
            mediaType: 'tv',
            doc: {
              ...featuredShow!,
              mediaType: 'tv',
              releaseDate: featuredShow!.firstAirDate ?? null,
            } as never,
          },
      profile,
    );
  }

  // Otherwise take the first title the feed surfaced — the strongest
  // recommendation, so the hero reflects the same personalisation as the rows.
  const candidate = rows.flatMap((row) => row.items)[0];
  if (!candidate) return null;

  const { buildTitleDetail } = await import('./title-detail.service');
  const { findTitleById } = await import('./catalog.service');
  const resolved = await findTitleById(candidate.mediaType, candidate.id);
  return resolved ? buildTitleDetail(resolved, profile) : null;
}
