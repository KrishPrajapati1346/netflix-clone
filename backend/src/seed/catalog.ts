import { type Types } from 'mongoose';
import { Episode } from '../models/Episode';
import { Movie } from '../models/Movie';
import { Season } from '../models/Season';
import { TVShow } from '../models/TVShow';
import { slugify, uniqueSlug } from '../utils/slug';
import { MOVIES, SHOWS, sourceFor } from './fixtures';
import archiveSources from './archive-sources.json';
import posterSources from './posters.json';

/**
 * Real films, resolved to their Internet Archive copies.
 *
 * Keyed by slug so a title picks up its own print rather than a shared sample
 * clip — without this every film in the catalog played the same four streams,
 * which looked like a bug even though it was only placeholder media.
 *
 * The JSON is committed and verified by `resolve-archive-sources.ts`; seeding
 * stays offline.
 */
const ARCHIVE_BY_SLUG = new Map(
  (archiveSources as Array<{ slug: string; url: string }>).map((entry) => [entry.slug, entry.url]),
);

/**
 * Real theatrical posters, from Wikimedia Commons.
 *
 * These films are public domain and so, in most cases, are their posters.
 * Titles without one — the Blender shorts, which never had a theatrical
 * poster — keep `posterUrl: null` and fall back to the generated artwork route.
 */
const POSTER_BY_SLUG = new Map(
  (posterSources as Array<{ slug: string; posterUrl: string }>).map((e) => [e.slug, e.posterUrl]),
);

/**
 * Seeds the catalog from the committed fixtures.
 *
 * Idempotent by slug: re-running updates existing titles in place rather than
 * duplicating them, so it is safe to run after editing a fixture.
 *
 * Deliberately **additive** — it never deletes. Titles an admin created through
 * the dashboard must survive a re-seed, and the seed cannot tell those apart
 * from a fixture that was removed. That means dropping a film from the fixtures
 * leaves the old row live; `npm run seed -- --reset` clears the catalog first,
 * for when you want the fixtures to be authoritative.
 */

export interface CatalogSeedResult {
  movies: number;
  shows: number;
  seasons: number;
  episodes: number;
}

/** Chapters give the player real "Skip intro"/"Skip credits" data to act on. */
function chaptersFor(runtimeMinutes: number) {
  const runtimeSeconds = runtimeMinutes * 60;
  if (runtimeSeconds < 240) return [];

  return [
    { kind: 'intro' as const, startSeconds: 8, endSeconds: 38 },
    {
      kind: 'credits' as const,
      startSeconds: Math.max(60, runtimeSeconds - 45),
      endSeconds: runtimeSeconds,
    },
  ];
}

const SUBTITLES = [
  { language: 'en' as const, label: 'English', url: '/subtitles/en.vtt', isDefault: true },
];

/**
 * The playable sources for one film.
 *
 * Prefers its real Internet Archive print (progressive MP4, range-requested by
 * the browser). Falls back to a rotating sample HLS stream only if the archive
 * map has no entry — which, after the resolver pass, it should not.
 */
function sourcesForMovie(title: string, index: number) {
  const archived = ARCHIVE_BY_SLUG.get(slugify(title));
  if (archived) {
    return [{ label: 'auto' as const, url: archived, type: 'mp4' as const }];
  }
  return sourceFor(index);
}

export async function seedCatalog(options: { reset?: boolean } = {}): Promise<CatalogSeedResult> {
  if (options.reset) {
    /*
      Explicit opt-in, because this also removes anything added through the
      admin panel. Viewer state pointing at deleted titles goes with it —
      orphaned progress and list rows would otherwise surface as broken cards
      in Continue Watching.
    */
    const [movieIds, showIds] = await Promise.all([
      Movie.find().distinct('_id'),
      TVShow.find().distinct('_id'),
    ]);
    const ids = [...movieIds, ...showIds];

    const { WatchProgress } = await import('../models/WatchProgress');
    const { ListEntry } = await import('../models/ListEntry');
    const { Rating, Reaction } = await import('../models/Rating');
    const { Review } = await import('../models/Review');

    await Promise.all([
      Movie.deleteMany({}),
      TVShow.deleteMany({}),
      Season.deleteMany({}),
      Episode.deleteMany({}),
      WatchProgress.deleteMany({ mediaId: { $in: ids } }),
      ListEntry.deleteMany({ mediaId: { $in: ids } }),
      Rating.deleteMany({ mediaId: { $in: ids } }),
      Reaction.deleteMany({ mediaId: { $in: ids } }),
      Review.deleteMany({ mediaId: { $in: ids } }),
    ]);
  }

  let movieCount = 0;

  for (const [index, fixture] of MOVIES.entries()) {
    const existing = await Movie.findOne({ title: fixture.title });
    const slug =
      existing?.slug ??
      (await uniqueSlug(fixture.title, async (candidate) =>
        Boolean(await Movie.exists({ slug: candidate })),
      ));

    await Movie.updateOne(
      { slug },
      {
        $set: {
          title: fixture.title,
          slug,
          overview: fixture.overview,
          tagline: fixture.tagline ?? null,
          genres: fixture.genres,
          language: fixture.language,
          maturityRating: fixture.maturityRating,
          releaseDate: new Date(fixture.releaseDate),
          runtimeMinutes: fixture.runtimeMinutes,
          directors: fixture.directors,
          cast: fixture.cast.map((member, order) => ({ ...member, order })),
          keywords: fixture.keywords,
          popularity: fixture.popularity,
          isPublished: true,
          isFeatured: fixture.isFeatured ?? false,
          sources: sourcesForMovie(fixture.title, index),
          subtitles: SUBTITLES,
          chapters: chaptersFor(fixture.runtimeMinutes),
          // A real poster when one exists; null falls through to the generated
          // artwork route, which is still what supplies every backdrop.
          posterUrl: POSTER_BY_SLUG.get(slugify(fixture.title)) ?? null,
          backdropUrl: null,
        },
      },
      { upsert: true },
    );
    movieCount++;
  }

  let showCount = 0;
  let seasonCount = 0;
  let episodeCount = 0;

  for (const [showIndex, fixture] of SHOWS.entries()) {
    const existing = await TVShow.findOne({ title: fixture.title });
    const slug =
      existing?.slug ??
      (await uniqueSlug(fixture.title, async (candidate) =>
        Boolean(await TVShow.exists({ slug: candidate })),
      ));

    const totalEpisodes = fixture.seasons.reduce((sum, season) => sum + season.episodes.length, 0);
    const totalRuntime = fixture.seasons.reduce(
      (sum, season) => sum + season.episodes.reduce((s, ep) => s + ep.runtimeMinutes, 0),
      0,
    );

    await TVShow.updateOne(
      { slug },
      {
        $set: {
          title: fixture.title,
          slug,
          overview: fixture.overview,
          tagline: fixture.tagline ?? null,
          genres: fixture.genres,
          language: fixture.language,
          maturityRating: fixture.maturityRating,
          firstAirDate: new Date(fixture.firstAirDate),
          lastAirDate: fixture.lastAirDate ? new Date(fixture.lastAirDate) : null,
          status: fixture.status,
          directors: fixture.directors,
          cast: fixture.cast.map((member, order) => ({ ...member, order })),
          keywords: fixture.keywords,
          popularity: fixture.popularity,
          isPublished: true,
          isFeatured: fixture.isFeatured ?? false,
          seasonCount: fixture.seasons.length,
          episodeCount: totalEpisodes,
          // Denormalised so runtime filters work uniformly across the union.
          averageRuntimeMinutes: totalEpisodes ? Math.round(totalRuntime / totalEpisodes) : 0,
          posterUrl: null,
          backdropUrl: null,
        },
      },
      { upsert: true },
    );

    const show = await TVShow.findOne({ slug });
    if (!show) continue;
    showCount++;

    for (const seasonFixture of fixture.seasons) {
      await Season.updateOne(
        { showId: show._id, seasonNumber: seasonFixture.seasonNumber },
        {
          $set: {
            name: seasonFixture.name,
            overview: seasonFixture.overview,
            airDate: new Date(seasonFixture.airDate),
            episodeCount: seasonFixture.episodes.length,
            posterUrl: null,
          },
        },
        { upsert: true },
      );

      const season = await Season.findOne({ showId: show._id, seasonNumber: seasonFixture.seasonNumber });
      if (!season) continue;
      seasonCount++;

      for (const [episodeIndex, episodeFixture] of seasonFixture.episodes.entries()) {
        await Episode.updateOne(
          {
            showId: show._id,
            seasonNumber: seasonFixture.seasonNumber,
            episodeNumber: episodeIndex + 1,
          },
          {
            $set: {
              seasonId: season._id,
              title: episodeFixture.title,
              overview: episodeFixture.overview,
              runtimeMinutes: episodeFixture.runtimeMinutes,
              airDate: new Date(seasonFixture.airDate),
              // Vary the stream per episode so "next episode" visibly changes.
              sources: sourceFor(showIndex + episodeIndex),
              subtitles: SUBTITLES,
              chapters: chaptersFor(episodeFixture.runtimeMinutes),
              isPublished: true,
              stillUrl: null,
            },
          },
          { upsert: true },
        );
        episodeCount++;
      }
    }
  }

  return { movies: movieCount, shows: showCount, seasons: seasonCount, episodes: episodeCount };
}

/**
 * Generates plausible ratings so the recommender has real signal to work with.
 *
 * A recommendation engine with an empty ratings collection can only ever return
 * the popularity fallback, which would make the collaborative row look broken
 * rather than cold. Ratings are derived from each title's popularity plus a
 * deterministic per-profile jitter, so profiles disagree — which is what makes
 * "viewers like you" produce different answers for different profiles.
 */
export async function seedRatings(profileIds: Types.ObjectId[]): Promise<number> {
  if (profileIds.length === 0) return 0;

  const { Rating } = await import('../models/Rating');

  const [movies, shows] = await Promise.all([
    Movie.find({ isPublished: true }).select('_id popularity genres').lean(),
    TVShow.find({ isPublished: true }).select('_id popularity genres').lean(),
  ]);

  const titles = [
    ...movies.map((m) => ({ id: m._id, type: 'movie' as const, popularity: m.popularity })),
    ...shows.map((s) => ({ id: s._id, type: 'tv' as const, popularity: s.popularity })),
  ];

  const operations = [];

  for (const [profileIndex, profileId] of profileIds.entries()) {
    for (const [titleIndex, title] of titles.entries()) {
      // Deterministic pseudo-random: same seed data produces the same catalog
      // every run, so the demo does not shuffle between restarts.
      const noise = ((profileIndex + 1) * 7919 + (titleIndex + 1) * 104729) % 100;
      if (noise > 62) continue; // Not every profile rates every title.

      const base = title.popularity / 20;
      const offset = (noise % 5) - 2;
      const score = Math.min(5, Math.max(0.5, Math.round((base + offset * 0.5) * 2) / 2));

      operations.push({
        updateOne: {
          filter: { profileId, mediaType: title.type, mediaId: title.id },
          update: { $set: { score, userId: profileId } },
          upsert: true,
        },
      });
    }
  }

  if (operations.length === 0) return 0;

  await Rating.bulkWrite(operations);
  await recomputeAggregates();
  return operations.length;
}

/**
 * Recomputes each title's denormalised `averageScore` and `ratingCount`.
 *
 * Denormalised because sorting a browse page by rating must not require joining
 * the whole ratings collection on every request. In production this would run
 * on a schedule or on rating writes; here the seed is the only writer.
 */
export async function recomputeAggregates(): Promise<void> {
  const { Rating } = await import('../models/Rating');

  const grouped = await Rating.aggregate<{
    _id: { mediaId: Types.ObjectId; mediaType: 'movie' | 'tv' };
    average: number;
    count: number;
  }>([
    {
      $group: {
        _id: { mediaId: '$mediaId', mediaType: '$mediaType' },
        average: { $avg: '$score' },
        count: { $sum: 1 },
      },
    },
  ]);

  const movieOps = [];
  const showOps = [];

  for (const row of grouped) {
    const update = {
      updateOne: {
        filter: { _id: row._id.mediaId },
        update: {
          $set: { averageScore: Math.round(row.average * 10) / 10, ratingCount: row.count },
        },
      },
    };
    if (row._id.mediaType === 'movie') movieOps.push(update);
    else showOps.push(update);
  }

  if (movieOps.length) await Movie.bulkWrite(movieOps);
  if (showOps.length) await TVShow.bulkWrite(showOps);
}
