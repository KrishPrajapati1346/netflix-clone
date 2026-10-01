/**
 * Resolves each public-domain film in the fixtures to its actual copy on the
 * Internet Archive, and writes the result to `archive-sources.json`.
 *
 * Why this exists: the fixtures originally rotated four sample HLS streams
 * across every title, so opening any two films played the same clip. That reads
 * as a bug even though the spec only asks for sample media. Archive.org hosts
 * genuine public-domain prints of most of this catalog, which fixes the
 * duplication *and* makes each title play the film it claims to be.
 *
 * The output is committed, so `npm run seed` stays offline — this script is run
 * by hand when the catalog changes, not as part of setup.
 *
 * Matching is deliberately conservative. Archive.org's title search returns a
 * lot of near-misses (a 1953 "Charade" for our 1963 one, double features,
 * colorised fan edits), so a candidate is only accepted when the release year
 * matches within a year and a playable MP4 of reasonable size exists. Anything
 * that fails falls back to the sample streams rather than silently playing the
 * wrong film.
 */

import fs from 'node:fs';
import path from 'node:path';
import { MOVIES } from './fixtures';

/** Curated collections; searching all of archive.org returns mostly noise. */
const COLLECTIONS = [
  'feature_films',
  'silent_films',
  'film_noir',
  'classic_movies',
  'sci-fi_horror',
  'SciFi_Horror',
  'short_films',
].join(' OR ');

const SEARCH = 'https://archive.org/advancedsearch.php';
const METADATA = 'https://archive.org/metadata';

interface Candidate {
  identifier: string;
  title: string;
  year?: number;
}

interface Resolved {
  slug: string;
  title: string;
  identifier: string;
  url: string;
  sizeMb: number;
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'kinora-seed/1.0 (portfolio project)' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return (await response.json()) as T;
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

async function findCandidates(title: string): Promise<Candidate[]> {
  const query = `title:("${title}") AND collection:(${COLLECTIONS})`;
  const url =
    `${SEARCH}?q=${encodeURIComponent(query)}` +
    '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&rows=8&output=json';

  const body = await json<{ response: { docs: Candidate[] } }>(url);
  return body.response.docs ?? [];
}

/**
 * Picks the best playable MP4 from an item.
 *
 * Prefers the largest file, which on archive.org is reliably the highest
 * quality derivative rather than a thumbnail or a trailer.
 */
async function bestSource(identifier: string): Promise<{ url: string; sizeMb: number } | null> {
  const meta = await json<{
    files?: Array<{ name: string; format?: string; size?: string }>;
    server?: string;
    dir?: string;
  }>(`${METADATA}/${identifier}`);

  const mp4s = (meta.files ?? [])
    .filter((file) => file.name.toLowerCase().endsWith('.mp4'))
    .map((file) => ({ name: file.name, size: Number(file.size ?? 0) }))
    .filter((file) => file.size > 20_000_000) // Below ~20 MB is a clip, not a feature.
    .sort((a, b) => b.size - a.size);

  const chosen = mp4s[0];
  if (!chosen) return null;

  // The stable /download/ path 302s to whichever node holds the item, which is
  // what we want to store — node hostnames change.
  return {
    url: `https://archive.org/download/${identifier}/${encodeURIComponent(chosen.name)}`,
    sizeMb: Math.round(chosen.size / 1_000_000),
  };
}

/** Confirms the URL actually serves video, following archive.org's redirect. */
async function playable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { Range: 'bytes=0-2047' },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    const type = response.headers.get('content-type') ?? '';
    return response.ok && type.startsWith('video/');
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const resolved: Resolved[] = [];
  const misses: string[] = [];

  for (const movie of MOVIES) {
    const year = new Date(movie.releaseDate).getUTCFullYear();
    process.stdout.write(`  ${movie.title} (${year}) … `);

    try {
      const candidates = await findCandidates(movie.title);

      // Year is the discriminator that rejects the wrong film of the same name.
      const matches = candidates.filter((c) => {
        const candidateYear = Number(c.year);
        return Number.isFinite(candidateYear) && Math.abs(candidateYear - year) <= 1;
      });

      let hit: Resolved | null = null;

      for (const candidate of matches) {
        const source = await bestSource(candidate.identifier);
        if (!source) continue;
        if (!(await playable(source.url))) continue;

        hit = {
          slug: slugify(movie.title),
          title: movie.title,
          identifier: candidate.identifier,
          url: source.url,
          sizeMb: source.sizeMb,
        };
        break;
      }

      if (hit) {
        resolved.push(hit);
        console.log(`OK  ${hit.identifier} (${hit.sizeMb} MB)`);
      } else {
        misses.push(movie.title);
        console.log(`no verified match (${candidates.length} candidates, ${matches.length} by year)`);
      }
    } catch (error) {
      misses.push(movie.title);
      console.log(`error: ${(error as Error).message}`);
    }
  }

  const out = path.join(__dirname, 'archive-sources.json');
  fs.writeFileSync(out, `${JSON.stringify(resolved, null, 2)}\n`);

  console.log(`\n  resolved ${resolved.length}/${MOVIES.length} films`);
  console.log(`  unmatched (will use sample streams): ${misses.join(', ') || 'none'}`);
  console.log(`  written to ${out}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
