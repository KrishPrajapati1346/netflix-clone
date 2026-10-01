/**
 * Downloads the resolved posters into `client/public/posters/` and rewrites
 * `posters.json` to point at the local copies.
 *
 * The first version hotlinked Wikimedia directly, and it broke: Wikimedia
 * returns **403 to any request without a descriptive User-Agent**, which is
 * exactly what Next's image optimizer sends when it fetches an upstream image
 * server-side. Twelve of thirty posters rendered as blank cards.
 *
 * Hosting them ourselves fixes that and three other things at once:
 *
 *  - no dependency on someone else's rate limit at page-load time,
 *  - no hotlinking of a charity's bandwidth,
 *  - the catalog keeps working offline, which is the project's whole premise.
 *
 * Files are fetched at a poster-sized width via `Special:FilePath` rather than
 * pulling 5000px originals and downscaling locally — it is less bandwidth for
 * them, and needs no image library here.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Enough for a 2:3 card on a high-DPI display, without shipping megabytes. */
const TARGET_WIDTH = 600;

/** Wikimedia requires a descriptive agent and blocks generic ones outright. */
const UA = 'kinora-seed/1.0 (portfolio project; https://github.com/example/kinora)';

interface PosterEntry {
  slug: string;
  title: string;
  article: string;
  posterUrl: string;
  width: number;
  height: number;
  localPath?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Builds a scaled-download URL for a Wikimedia file.
 *
 * Uses `Special:FilePath?width=`, the documented scaling entry point.
 * Constructing `/thumb/<a>/<ab>/<file>/<n>px-<file>` by hand — the obvious
 * approach, and what this did first — now returns *400 "Use thumbnail sizes
 * listed on..."*: Wikimedia only serves a fixed set of widths by that route.
 * `Special:FilePath` has no such restriction and picks the nearest rendition.
 *
 * The wiki host matters: files under `/wikipedia/commons/` live on Commons,
 * everything else (fair-use posters, mostly) on the local project wiki.
 */
function scaledUrl(original: string, width: number): string | null {
  const match = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/([^/]+)\/[0-9a-f]\/[0-9a-f]{2}\/(.+)$/.exec(
    original,
  );
  if (!match) return null;

  const [, wiki, file] = match;
  const host = wiki === 'commons' ? 'commons.wikimedia.org' : `${wiki}.wikipedia.org`;
  return `https://${host}/wiki/Special:FilePath/${file}?width=${width}`;
}

async function download(url: string, attempt = 0): Promise<Buffer | null> {
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*' },
    signal: AbortSignal.timeout(60_000),
  });

  if ((response.status === 429 || response.status === 503) && attempt < 6) {
    await sleep(3000 * 2 ** attempt);
    return download(url, attempt + 1);
  }

  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

async function main(): Promise<void> {
  const jsonPath = path.join(__dirname, 'posters.json');
  const entries = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as PosterEntry[];

  const outDir = path.resolve(__dirname, '../../../client/public/posters');
  fs.mkdirSync(outDir, { recursive: true });

  let saved = 0;
  const failed: string[] = [];

  for (const entry of entries) {
    // Already local from a previous run.
    if (entry.posterUrl.startsWith('/posters/')) {
      const existing = path.join(outDir, path.basename(entry.posterUrl));
      if (fs.existsSync(existing)) {
        saved++;
        continue;
      }
    }

    const source = entry.posterUrl.startsWith('http')
      ? entry.posterUrl
      : `https://upload.wikimedia.org${entry.posterUrl}`;

    const url = scaledUrl(source, TARGET_WIDTH) ?? source;
    process.stdout.write(`  ${entry.title} … `);

    await sleep(700);
    const buffer = await download(url);

    if (!buffer || buffer.byteLength < 2000) {
      failed.push(entry.title);
      console.log('failed');
      continue;
    }

    // Thumbs are JPEG unless the original was a PNG-rendered SVG.
    const extension = url.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const filename = `${entry.slug}.${extension}`;
    fs.writeFileSync(path.join(outDir, filename), buffer);

    entry.posterUrl = `/posters/${filename}`;
    entry.width = TARGET_WIDTH;
    entry.height = Math.round((entry.height / entry.width) * TARGET_WIDTH) || 900;
    saved++;
    console.log(`${Math.round(buffer.byteLength / 1024)} KB`);
  }

  /*
    Write every entry back, not just the successes.

    An earlier version pruned failures here, which meant one bad run (a transient
    429) silently destroyed the resolver's output and forced a full re-resolve.
    The seed already treats a non-local `posterUrl` as "no poster", so leaving
    failures in place costs nothing and keeps this script re-runnable.
  */
  fs.writeFileSync(jsonPath, `${JSON.stringify(entries, null, 2)}\n`);

  const bytes = fs
    .readdirSync(outDir)
    .reduce((sum, file) => sum + fs.statSync(path.join(outDir, file)).size, 0);

  console.log(`\n  ${saved} posters saved to client/public/posters (${(bytes / 1_048_576).toFixed(1)} MB)`);
  if (failed.length > 0) console.log(`  failed, will use generated art: ${failed.join(', ')}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
