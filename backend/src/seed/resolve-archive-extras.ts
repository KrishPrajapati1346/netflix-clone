/**
 * Second pass over the films `resolve-archive-sources.ts` could not match.
 *
 * Two reasons the automatic pass misses:
 *
 *  - **Year metadata is missing or wrong** on archive.org for some items, so
 *    the year filter (which exists to reject the 1953 "Charade" when we want
 *    the 1963 one) throws away good matches too.
 *  - **The Blender open movies are not in the curated film collections**, and
 *    the 20 MB size floor rejects shorts that run three minutes.
 *
 * Rather than loosening the automatic matcher — which would start returning
 * wrong films — the identifiers below were picked by hand from the search
 * results and are verified here before being merged. Anything that fails
 * verification stays on a sample stream.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Hand-picked, chosen by inspecting archive.org search output. */
const PICKS: Array<{ slug: string; title: string; identifier: string }> = [
  { slug: 'the-general', title: 'The General', identifier: 'TheGeneral720p1926' },
  { slug: 'plan-9-from-outer-space', title: 'Plan 9 from Outer Space', identifier: 'plan-9-from-outer-space_zomboo' },
  { slug: 'the-kid', title: 'The Kid', identifier: 'CharlieChaplinTheKid1921' },
  { slug: 'a-trip-to-the-moon', title: 'A Trip to the Moon', identifier: 'le-voyage-dans-la-lune-1902-georges-melies-hq-musi' },
  { slug: 'the-passion-of-joan-of-arc', title: 'The Passion of Joan of Arc', identifier: 'passion-joan-of-arc' },
  { slug: 'my-man-godfrey', title: 'My Man Godfrey', identifier: 'turner_video_44' },
  { slug: 'charade', title: 'Charade', identifier: 'charade_202604' },
  { slug: 'big-buck-bunny', title: 'Big Buck Bunny', identifier: 'big-buck-bunny-720p-h264_202403' },
  { slug: 'sintel', title: 'Sintel', identifier: 'sintel_202604' },
  { slug: 'tears-of-steel', title: 'Tears of Steel', identifier: 'tears-of-steel_202601' },
  { slug: 'elephants-dream', title: 'Elephants Dream', identifier: 'ed-1080p-h-264_265_266-aac' },
  { slug: 'cosmos-laundromat', title: 'Cosmos Laundromat', identifier: 'cosmos-laundromat-first-cycle' },
  { slug: 'sprite-fright', title: 'Sprite Fright', identifier: 'sprite-fright' },
  { slug: 'coffee-run', title: 'Coffee Run', identifier: 'coffee-run' },
  { slug: 'agent-327-operation-barbershop', title: 'Agent 327: Operation Barbershop', identifier: 'agent327operationbarbershop' },
  { slug: 'spring', title: 'Spring', identifier: 'spring_blenderopenmovie' },
  { slug: 'caminandes-llamigos', title: 'Caminandes: Llamigos', identifier: 'caminandes-3-llamigos' },
  { slug: 'charge', title: 'Charge', identifier: 'charge-blender-open-movie-1608p' },
];

/** Shorts are legitimately small, so the feature-length floor does not apply. */
const MIN_BYTES = 2_000_000;

interface Resolved {
  slug: string;
  title: string;
  identifier: string;
  url: string;
  sizeMb: number;
}

async function bestSource(identifier: string): Promise<{ url: string; sizeMb: number } | null> {
  const response = await fetch(`https://archive.org/metadata/${identifier}`, {
    headers: { 'User-Agent': 'kinora-seed/1.0 (portfolio project)' },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) return null;

  const meta = (await response.json()) as { files?: Array<{ name: string; size?: string }> };

  const mp4s = (meta.files ?? [])
    .filter((file) => file.name.toLowerCase().endsWith('.mp4'))
    .map((file) => ({ name: file.name, size: Number(file.size ?? 0) }))
    .filter((file) => file.size > MIN_BYTES)
    .sort((a, b) => b.size - a.size);

  const chosen = mp4s[0];
  if (!chosen) return null;

  return {
    url: `https://archive.org/download/${identifier}/${encodeURIComponent(chosen.name)}`,
    sizeMb: Math.round(chosen.size / 1_000_000),
  };
}

async function playable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { Range: 'bytes=0-2047' },
      redirect: 'follow',
      signal: AbortSignal.timeout(90_000),
    });
    return response.ok && (response.headers.get('content-type') ?? '').startsWith('video/');
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const file = path.join(__dirname, 'archive-sources.json');
  const existing = JSON.parse(fs.readFileSync(file, 'utf8')) as Resolved[];
  const bySlug = new Map(existing.map((entry) => [entry.slug, entry]));

  for (const pick of PICKS) {
    process.stdout.write(`  ${pick.title} … `);

    const source = await bestSource(pick.identifier);
    if (!source) {
      console.log('no usable mp4');
      continue;
    }

    if (!(await playable(source.url))) {
      console.log('not playable');
      continue;
    }

    bySlug.set(pick.slug, { ...pick, ...source });
    console.log(`OK  ${pick.identifier} (${source.sizeMb} MB)`);
  }

  const merged = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`\n  ${merged.length} films now have a real source`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
