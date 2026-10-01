import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Movie } from '../src/models/Movie';
import { Profile } from '../src/models/Profile';
import { TVShow } from '../src/models/TVShow';
import { api, app, bearer, registerUser } from './helpers';

/**
 * Catalog, search and maturity filtering.
 *
 * These run against a real MongoDB rather than mocks, because the behaviour
 * worth testing here *is* the database behaviour: `$unionWith` merging two
 * collections, index-backed sorts, unique constraints and text search. A mock
 * would assert that the code calls the functions it calls, which proves nothing.
 */

async function seedTitles() {
  await Movie.create([
    {
      title: 'Quiet Harbour',
      slug: 'quiet-harbour',
      overview: 'A lighthouse keeper counts the ships that never arrive.',
      genres: ['Drama'],
      language: 'en',
      maturityRating: 'PG',
      releaseDate: new Date('2019-04-01'),
      runtimeMinutes: 98,
      popularity: 80,
      averageScore: 4.2,
      keywords: ['maritime', 'solitude'],
      directors: ['Isla Bern'],
      isPublished: true,
      sources: [{ label: 'auto', url: 'https://example.test/a.m3u8', type: 'hls' }],
    },
    {
      title: 'Midnight Static',
      slug: 'midnight-static',
      overview: 'A pirate radio host picks up a broadcast from a station that burned down.',
      genres: ['Horror', 'Mystery'],
      language: 'en',
      maturityRating: 'R',
      releaseDate: new Date('2021-10-31'),
      runtimeMinutes: 104,
      popularity: 95,
      averageScore: 3.9,
      keywords: ['radio', 'haunting'],
      directors: ['Dell Auber'],
      isPublished: true,
    },
    {
      title: 'Unfinished Draft',
      slug: 'unfinished-draft',
      overview: 'Not ready for viewers.',
      genres: ['Drama'],
      language: 'en',
      maturityRating: 'PG',
      runtimeMinutes: 90,
      popularity: 200,
      isPublished: false,
    },
  ]);

  await TVShow.create({
    title: 'Harbour Nights',
    slug: 'harbour-nights',
    overview: 'An anthology set along the same stretch of coast.',
    genres: ['Drama', 'Mystery'],
    language: 'en',
    maturityRating: 'TV-PG',
    firstAirDate: new Date('2020-06-01'),
    popularity: 90,
    averageScore: 4.0,
    seasonCount: 1,
    episodeCount: 3,
    averageRuntimeMinutes: 42,
    isPublished: true,
  });
}

beforeEach(seedTitles);

describe('GET /catalog/browse', () => {
  it('merges films and series into one paginated result', async () => {
    const response = await request(app).get(api('/catalog/browse')).expect(200);

    const types = response.body.data.items.map((item: { mediaType: string }) => item.mediaType);
    expect(types).toContain('movie');
    expect(types).toContain('tv');
    // The union is one query, so the total counts both collections.
    expect(response.body.data.total).toBe(3);
  });

  it('hides unpublished titles from viewers', async () => {
    const response = await request(app).get(api('/catalog/browse')).expect(200);
    const titles = response.body.data.items.map((item: { title: string }) => item.title);

    // High popularity would put it first if it were visible at all.
    expect(titles).not.toContain('Unfinished Draft');
  });

  it('filters by genre across both collections', async () => {
    const response = await request(app).get(api('/catalog/browse?genre=Mystery')).expect(200);
    const titles = response.body.data.items.map((item: { title: string }) => item.title);

    expect(titles).toEqual(expect.arrayContaining(['Midnight Static', 'Harbour Nights']));
    expect(titles).not.toContain('Quiet Harbour');
  });

  it('sorts by a shared field even though the underlying names differ', async () => {
    // Shows store `firstAirDate`; the union aliases it to `releaseDate` so one
    // sort spec covers both.
    const response = await request(app)
      .get(api('/catalog/browse?sort=releaseDate&order=desc'))
      .expect(200);

    const years = response.body.data.items.map((item: { releaseYear: number }) => item.releaseYear);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('paginates without repeating or skipping titles', async () => {
    const [first, second] = await Promise.all([
      request(app).get(api('/catalog/browse?limit=2&page=1')).expect(200),
      request(app).get(api('/catalog/browse?limit=2&page=2')).expect(200),
    ]);

    const firstIds = first.body.data.items.map((item: { id: string }) => item.id);
    const secondIds = second.body.data.items.map((item: { id: string }) => item.id);

    // The `_id` tiebreak in the sort is what makes this stable; without it,
    // equal-popularity titles can appear on both pages.
    expect(firstIds.filter((id: string) => secondIds.includes(id))).toHaveLength(0);
  });

  it('rejects an out-of-range limit', async () => {
    await request(app).get(api('/catalog/browse?limit=5000')).expect(422);
  });
});

describe('maturity filtering', () => {
  it('hides adult titles from a kids profile everywhere', async () => {
    const user = await registerUser();
    const account = await Profile.findOne({ userId: user.userId });

    const kids = await Profile.create({
      userId: account!.userId,
      name: 'Kiddo',
      isKids: true,
      maturityLimit: 'PG',
    });

    const select = await request(app)
      .post(api('/profiles/select'))
      .set(...bearer(user.accessToken))
      .send({ profileId: kids._id.toString() })
      .expect(200);

    const grant = select.body.data.profileToken;

    const browse = await request(app)
      .get(api('/catalog/browse'))
      .set(...bearer(user.accessToken))
      .set('X-Kinora-Profile', grant)
      .expect(200);

    const titles = browse.body.data.items.map((item: { title: string }) => item.title);
    expect(titles).toContain('Quiet Harbour');
    expect(titles).not.toContain('Midnight Static'); // rated R

    // Search must apply the same limit, or it becomes the way around it.
    const search = await request(app)
      .get(api('/search?q=midnight'))
      .set(...bearer(user.accessToken))
      .set('X-Kinora-Profile', grant)
      .expect(200);
    expect(search.body.data.total).toBe(0);

    // And so must the detail route — 404, not 403, so the title's existence
    // is not confirmed.
    await request(app)
      .get(api('/catalog/titles/midnight-static'))
      .set(...bearer(user.accessToken))
      .set('X-Kinora-Profile', grant)
      .expect(404);
  });

  it('cannot be widened by a crafted query parameter', async () => {
    const user = await registerUser();
    const account = await Profile.findOne({ userId: user.userId });
    const kids = await Profile.create({
      userId: account!.userId,
      name: 'Kiddo2',
      isKids: true,
      maturityLimit: 'PG',
    });

    const select = await request(app)
      .post(api('/profiles/select'))
      .set(...bearer(user.accessToken))
      .send({ profileId: kids._id.toString() })
      .expect(200);

    // Explicitly asking for R-rated titles must not grant them: the allowed set
    // is derived from the profile, and the query can only narrow it.
    const response = await request(app)
      .get(api('/catalog/browse?rating=R'))
      .set(...bearer(user.accessToken))
      .set('X-Kinora-Profile', select.body.data.profileToken)
      .expect(200);

    expect(response.body.data.items).toHaveLength(0);
  });
});

describe('GET /search', () => {
  it('finds an exact title', async () => {
    const response = await request(app).get(api('/search?q=Quiet Harbour')).expect(200);
    expect(response.body.data.items[0].title).toBe('Quiet Harbour');
    expect(response.body.data.didYouMean).toBe(false);
  });

  it('finds a partial word the text index alone would miss', async () => {
    // `$text` matches whole stemmed tokens, so "harb" needs the regex pass.
    const response = await request(app).get(api('/search?q=harb')).expect(200);
    expect(response.body.data.total).toBeGreaterThan(0);
  });

  it('still finds a title when one word is misspelled', async () => {
    // "Quiet" is spelled correctly, so the text index matches it on the first
    // pass — no fuzzy fallback needed, and `didYouMean` stays false.
    const response = await request(app).get(api('/search?q=Quiet Harbuor')).expect(200);

    expect(response.body.data.items[0].title).toBe('Quiet Harbour');
    expect(response.body.data.didYouMean).toBe(false);
  });

  it('falls back to edit distance when no word matches, and flags it', async () => {
    // Every word misspelled: the text index finds nothing, the substring pass
    // finds nothing, and only the Levenshtein pass can recover it.
    const response = await request(app).get(api('/search?q=Qiuet Harbuor')).expect(200);

    expect(response.body.data.total).toBeGreaterThan(0);
    expect(response.body.data.items[0].title).toBe('Quiet Harbour');
    // The flag is what lets the UI say "no exact match, showing closest".
    expect(response.body.data.didYouMean).toBe(true);
  });

  it('searches cast and crew, not just titles', async () => {
    const response = await request(app).get(api('/search?q=Auber')).expect(200);
    expect(response.body.data.items[0].title).toBe('Midnight Static');
  });

  it('reports which engine answered', async () => {
    const response = await request(app).get(api('/search?q=harbour')).expect(200);
    // No Atlas configured in test, so the local fallback must be reported.
    expect(response.body.data.engine).toBe('local');
  });

  it('requires a non-empty query', async () => {
    await request(app).get(api('/search?q=')).expect(422);
  });

  it('is not fooled by regex metacharacters in the query', async () => {
    // A naive implementation would compile this as a regex and match everything.
    const response = await request(app).get(api('/search?q=.*')).expect(200);
    expect(response.body.data.total).toBe(0);
  });
});

describe('GET /catalog/titles/:slug', () => {
  it('returns full detail for a published title', async () => {
    const response = await request(app).get(api('/catalog/titles/quiet-harbour')).expect(200);

    expect(response.body.data.title).toBe('Quiet Harbour');
    expect(response.body.data.sources).toHaveLength(1);
    expect(response.body.data.viewerState).toBeNull(); // anonymous
  });

  it('404s an unpublished title', async () => {
    await request(app).get(api('/catalog/titles/unfinished-draft')).expect(404);
  });
});
