import { Episode } from '../models/Episode';
import { Movie } from '../models/Movie';
import { Profile } from '../models/Profile';
import { Rating } from '../models/Rating';
import { Review } from '../models/Review';
import { TVShow } from '../models/TVShow';
import { User } from '../models/User';
import { WatchProgress } from '../models/WatchProgress';

/**
 * Analytics, computed on demand with aggregation pipelines.
 *
 * No warehouse, no scheduled rollups — at this scale the pipelines run in
 * milliseconds against indexed collections, and a pre-aggregation layer would
 * be infrastructure with nothing to do. The README names this as the first
 * thing that would change under real load.
 *
 * Watch *hours* are derived from `WatchProgress.positionSeconds` rather than
 * counting plays: a title someone opened and abandoned after ten seconds is not
 * an hour watched, and only position knows the difference.
 */

export interface DailyPoint {
  date: string;
  value: number;
}

export interface AnalyticsSummary {
  totals: {
    users: number;
    profiles: number;
    movies: number;
    shows: number;
    episodes: number;
    reviews: number;
    ratings: number;
    watchHours: number;
  };
  activity: {
    dau: number;
    mau: number;
    /** DAU/MAU as a percentage — the standard stickiness measure. */
    stickiness: number;
  };
  userGrowth: DailyPoint[];
  watchHours: DailyPoint[];
  topGenres: Array<{ genre: string; watchCount: number }>;
  topTitles: Array<{ title: string; slug: string; mediaType: string; watchCount: number; averageScore: number }>;
  ratingDistribution: Array<{ score: number; count: number }>;
}

/** Midnight UTC `days` ago — the left edge of every windowed query below. */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Fills gaps in a daily series.
 *
 * An aggregation only returns days that had rows, so a chart plotted straight
 * from it silently closes the gaps and misrepresents a quiet week as continuous
 * activity. Explicit zeroes keep the x-axis honest.
 */
function fillDays(rows: Array<{ _id: string; value: number }>, days: number): DailyPoint[] {
  const byDate = new Map(rows.map((row) => [row._id, row.value]));
  const series: DailyPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const date = daysAgo(offset).toISOString().slice(0, 10);
    series.push({ date, value: byDate.get(date) ?? 0 });
  }

  return series;
}

export async function getAnalytics(windowDays = 30): Promise<AnalyticsSummary> {
  const since = daysAgo(windowDays);
  const dayStart = daysAgo(0);
  const monthStart = daysAgo(30);

  const [
    users,
    profiles,
    movies,
    shows,
    episodes,
    reviews,
    ratings,
    watchSecondsAgg,
    dau,
    mau,
    growthRows,
    watchRows,
    genreRows,
    topMovieRows,
    topShowRows,
    ratingRows,
  ] = await Promise.all([
    User.countDocuments(),
    Profile.countDocuments(),
    Movie.countDocuments({ isPublished: true }),
    TVShow.countDocuments({ isPublished: true }),
    Episode.countDocuments({ isPublished: true }),
    Review.countDocuments(),
    Rating.countDocuments(),

    WatchProgress.aggregate<{ seconds: number }>([
      { $group: { _id: null, seconds: { $sum: '$positionSeconds' } } },
    ]),

    // Distinct profiles active today / in the last 30 days.
    WatchProgress.distinct('profileId', { lastWatchedAt: { $gte: dayStart } }),
    WatchProgress.distinct('profileId', { lastWatchedAt: { $gte: monthStart } }),

    User.aggregate<{ _id: string; value: number }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          value: { $sum: 1 },
        },
      },
    ]),

    WatchProgress.aggregate<{ _id: string; value: number }>([
      { $match: { lastWatchedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastWatchedAt' } },
          value: { $sum: { $divide: ['$positionSeconds', 3600] } },
        },
      },
    ]),

    /**
     * Top genres by watch count.
     *
     * Starts from watch rows and looks the title up, rather than the reverse:
     * the interesting quantity is what people actually watched, and joining
     * from the catalog side would count titles nobody opened.
     */
    WatchProgress.aggregate<{ _id: string; watchCount: number }>([
      { $match: { mediaType: 'movie' } },
      { $lookup: { from: 'movies', localField: 'mediaId', foreignField: '_id', as: 'title' } },
      { $unwind: '$title' },
      { $unwind: '$title.genres' },
      { $group: { _id: '$title.genres', watchCount: { $sum: 1 } } },
      {
        $unionWith: {
          coll: 'watchprogresses',
          pipeline: [
            { $match: { mediaType: 'tv' } },
            { $lookup: { from: 'tvshows', localField: 'mediaId', foreignField: '_id', as: 'title' } },
            { $unwind: '$title' },
            { $unwind: '$title.genres' },
            { $group: { _id: '$title.genres', watchCount: { $sum: 1 } } },
          ],
        },
      },
      // The union can yield the same genre twice (once per collection), so
      // regroup before sorting.
      { $group: { _id: '$_id', watchCount: { $sum: '$watchCount' } } },
      { $sort: { watchCount: -1 } },
      { $limit: 8 },
    ]),

    WatchProgress.aggregate([
      { $match: { mediaType: 'movie' } },
      { $group: { _id: '$mediaId', watchCount: { $sum: 1 } } },
      { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'title' } },
      { $unwind: '$title' },
      {
        $project: {
          title: '$title.title',
          slug: '$title.slug',
          mediaType: 'movie',
          watchCount: 1,
          averageScore: '$title.averageScore',
        },
      },
      { $sort: { watchCount: -1 } },
      { $limit: 10 },
    ]),

    WatchProgress.aggregate([
      { $match: { mediaType: 'tv' } },
      { $group: { _id: '$mediaId', watchCount: { $sum: 1 } } },
      { $lookup: { from: 'tvshows', localField: '_id', foreignField: '_id', as: 'title' } },
      { $unwind: '$title' },
      {
        $project: {
          title: '$title.title',
          slug: '$title.slug',
          mediaType: 'tv',
          watchCount: 1,
          averageScore: '$title.averageScore',
        },
      },
      { $sort: { watchCount: -1 } },
      { $limit: 10 },
    ]),

    Rating.aggregate<{ _id: number; count: number }>([
      { $group: { _id: '$score', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalSeconds = watchSecondsAgg[0]?.seconds ?? 0;
  const dauCount = dau.length;
  const mauCount = mau.length;

  const topTitles = [...topMovieRows, ...topShowRows]
    .sort((a, b) => b.watchCount - a.watchCount)
    .slice(0, 10)
    .map((row) => ({
      title: row.title as string,
      slug: row.slug as string,
      mediaType: row.mediaType as string,
      watchCount: row.watchCount as number,
      averageScore: Math.round(((row.averageScore as number) ?? 0) * 10) / 10,
    }));

  return {
    totals: {
      users,
      profiles,
      movies,
      shows,
      episodes,
      reviews,
      ratings,
      watchHours: Math.round((totalSeconds / 3600) * 10) / 10,
    },
    activity: {
      dau: dauCount,
      mau: mauCount,
      stickiness: mauCount > 0 ? Math.round((dauCount / mauCount) * 100) : 0,
    },
    userGrowth: fillDays(growthRows, windowDays),
    watchHours: fillDays(
      watchRows.map((row) => ({ _id: row._id, value: Math.round(row.value * 10) / 10 })),
      windowDays,
    ),
    topGenres: genreRows.map((row) => ({ genre: row._id, watchCount: row.watchCount })),
    topTitles,
    ratingDistribution: ratingRows.map((row) => ({ score: row._id, count: row.count })),
  };
}
