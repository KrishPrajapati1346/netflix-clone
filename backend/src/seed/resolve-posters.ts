/**
 * Resolves each film to its real poster image, and writes `posters.json`.
 *
 * The generated SVG artwork is a decent fallback, but it is still obviously
 * generated. For a catalog of *public-domain* films the actual theatrical
 * posters are usually public domain too, and Wikipedia hosts them on Wikimedia
 * Commons — no API key, no rate-limit deal, no rights problem.
 *
 * Uses the REST summary endpoint, which returns the article's lead image. For a
 * film article that is reliably the poster.
 *
 * Matching is checked rather than assumed: the resolved article's title has to
 * look like the film we asked for, because Wikipedia search happily returns the
 * remake, the novel, or an unrelated article of the same name. Anything
 * uncertain is left without a poster and falls back to generated art.
 */

import fs from 'node:fs';
import path from 'node:path';
import { MOVIES } from './fixtures';

const SEARCH = 'https://en.wikipedia.org/w/api.php';
const SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const UA = 'kinora-seed/1.0 (portfolio project; contact via repo)';

interface PosterEntry {
  slug: string;
  title: string;
  article: string;
  posterUrl: string;
  width: number;
  height: number;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches JSON, respecting Wikipedia's rate limit.
 *
 * Unauthenticated clients get roughly one request per second before a 429, and
 * the first run of this script tripped it after fourteen films. Backing off and
 * retrying is the difference between resolving ten posters and all of them.
 */
async function json<T>(url: string, attempt = 0): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(45_000),
    });

    if ((response.status === 429 || response.status >= 500) && attempt < 6) {
      await sleep(3000 * 2 ** attempt);
      return json<T>(url, attempt + 1);
    }

    if (!response.ok) throw new Error(`${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    // Retry transport failures too. Sustained polling of Wikipedia produces
    // intermittent connection resets that are not status codes, and treating
    // them as permanent misses left 45 of 47 films without a poster.
    if (attempt < 6) {
      await sleep(3000 * 2 ** attempt);
      return json<T>(url, attempt + 1);
    }
    throw error;
  }
}

/**
 * Films whose article the search scorer gets wrong.
 *
 * Wikipedia's search ranks year-index pages ("1945 in film") above the film
 * itself for some titles, and the scorer cannot tell the difference — both
 * contain the words. Naming the article directly is more honest than tuning the
 * heuristic until it happens to work.
 */
const ARTICLE_OVERRIDES: Record<string, string> = {
  'Night of the Living Dead': 'Night of the Living Dead',
  'Steamboat Bill, Jr.': 'Steamboat Bill Jr.',
  'Scarlet Street': 'Scarlet Street',
  'Meet John Doe': 'Meet John Doe',
  'The Brain That Wouldn’t Die': "The Brain That Wouldn't Die",
  'The Little Shop of Horrors': 'The Little Shop of Horrors',
  'D.O.A.': 'D.O.A. (1949 film)',
  'Carnival of Souls': 'Carnival of Souls',
  'Plan 9 from Outer Space': 'Plan 9 from Outer Space',
  // The bare article's lead image is the 1957 remake's poster, not Powell and
  // Lombard's 1936 original.
  'My Man Godfrey': 'My Man Godfrey (1936 film)',
};

/** Finds the most likely article title for a film. */
async function findArticle(title: string, year: number): Promise<string | null> {
  const override = ARTICLE_OVERRIDES[title];
  if (override) return override;

  const query = `${title} ${year} film`;
  const url =
    `${SEARCH}?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    '&srlimit=5&format=json&origin=*';

  const body = await json<{ query?: { search?: Array<{ title: string }> } }>(url);
  const hits = body.query?.search ?? [];
  if (hits.length === 0) return null;

  const wanted = title.toLowerCase().replace(/[^a-z0-9]/g, '');

  /*
    Containment is a *gate*, not a weight.

    It used to be worth +3 against a threshold of 3, with "film" and the year
    worth +2 each — so an article that merely mentioned a film from the right
    year could clear the bar without containing the title at all. That is how
    Sherlock Jr. ended up with The Navigator's poster, The Hitch-Hiker with The
    Bigamist's, and Too Late for Tears with Little Women's: all 1924/1953/1949
    films, none of them the one asked for.
  */
  const candidates = hits.filter((hit) =>
    hit.title.toLowerCase().replace(/[^a-z0-9]/g, '').includes(wanted),
  );
  if (candidates.length === 0) return null;

  // Among genuine matches, prefer the one disambiguated as a film of this year.
  const scored = candidates.map((hit) => {
    const name = hit.title.toLowerCase();
    let score = 0;
    if (name.includes('film')) score += 2;
    if (name.includes(String(year))) score += 2;
    return { title: hit.title, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.title;
}

async function leadImage(article: string): Promise<{ url: string; width: number; height: number } | null> {
  const body = await json<{
    originalimage?: { source: string; width: number; height: number };
    thumbnail?: { source: string; width: number; height: number };
  }>(`${SUMMARY}/${encodeURIComponent(article.replace(/ /g, '_'))}`);

  const image = body.originalimage ?? body.thumbnail;
  if (!image) return null;

  // Strip the analytics query Wikipedia appends; the bare URL is the stable one.
  const url = image.source.split('?')[0]!;

  // Posters are portrait. A landscape lead image is a film still or a logo, not
  // the poster, and would look wrong in a 2:3 card.
  if (image.height <= image.width) return null;

  return { url, width: image.width, height: image.height };
}

async function main(): Promise<void> {
  const out = path.join(__dirname, 'posters.json');

  // Resumable: a rate-limited run can be re-run to fill only the gaps.
  const existing: PosterEntry[] = fs.existsSync(out)
    ? (JSON.parse(fs.readFileSync(out, 'utf8')) as PosterEntry[])
    : [];
  const bySlug = new Map(existing.map((entry) => [entry.slug, entry]));

  const misses: string[] = [];

  for (const movie of MOVIES) {
    if (bySlug.has(slugify(movie.title))) continue;

    // One film per ~1.2s keeps us inside the unauthenticated budget.
    await sleep(1200);
    const year = new Date(movie.releaseDate).getUTCFullYear();
    process.stdout.write(`  ${movie.title} … `);

    try {
      const article = await findArticle(movie.title, year);
      if (!article) {
        misses.push(movie.title);
        console.log('no confident article match');
        continue;
      }

      const image = await leadImage(article);
      if (!image) {
        misses.push(movie.title);
        console.log(`"${article}" has no portrait lead image`);
        continue;
      }

      bySlug.set(slugify(movie.title), {
        slug: slugify(movie.title),
        title: movie.title,
        article,
        posterUrl: image.url,
        width: image.width,
        height: image.height,
      });
      console.log(`OK  ${image.width}x${image.height}`);
    } catch (error) {
      misses.push(movie.title);
      console.log(`error: ${(error as Error).message}`);
    }
  }

  const resolved = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(out, `${JSON.stringify(resolved, null, 2)}\n`);

  console.log(`\n  resolved ${resolved.length}/${MOVIES.length} posters`);
  console.log(`  falling back to generated art: ${misses.join(', ') || 'none'}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
