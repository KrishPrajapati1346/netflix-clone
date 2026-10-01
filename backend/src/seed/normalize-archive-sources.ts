/**
 * Re-picks the video file for any entry whose chosen derivative is too large
 * to stream sensibly.
 *
 * The resolvers originally took the *largest* MP4 on the assumption it was the
 * best derivative. On archive.org that is often true, but some items also carry
 * a lossless or raw master — Charade resolved to a 38 GB file and The General to
 * 6.5 GB. Those are archival copies, not something a browser should be asked to
 * range-request over a home connection.
 *
 * The rule is now "largest file under the cap", which picks the best *practical*
 * derivative, falling back to the smallest available when everything exceeds it.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Above this, a file is an archival master rather than a viewing copy. */
const MAX_BYTES = 1_500_000_000;

interface Resolved {
  slug: string;
  title: string;
  identifier: string;
  url: string;
  sizeMb: number;
}

async function repick(identifier: string): Promise<{ url: string; sizeMb: number } | null> {
  const response = await fetch(`https://archive.org/metadata/${identifier}`, {
    headers: { 'User-Agent': 'kinora-seed/1.0 (portfolio project)' },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) return null;

  const meta = (await response.json()) as { files?: Array<{ name: string; size?: string }> };

  const mp4s = (meta.files ?? [])
    .filter((file) => file.name.toLowerCase().endsWith('.mp4'))
    .map((file) => ({ name: file.name, size: Number(file.size ?? 0) }))
    .filter((file) => file.size > 2_000_000)
    .sort((a, b) => b.size - a.size);

  if (mp4s.length === 0) return null;

  // Largest under the cap; if every copy is oversized, take the smallest.
  const chosen = mp4s.find((file) => file.size <= MAX_BYTES) ?? mp4s[mp4s.length - 1]!;

  return {
    url: `https://archive.org/download/${identifier}/${encodeURIComponent(chosen.name)}`,
    sizeMb: Math.round(chosen.size / 1_000_000),
  };
}

async function main(): Promise<void> {
  const file = path.join(__dirname, 'archive-sources.json');
  const entries = JSON.parse(fs.readFileSync(file, 'utf8')) as Resolved[];

  const oversized = entries.filter((entry) => entry.sizeMb * 1_000_000 > MAX_BYTES);
  console.log(`  ${oversized.length} of ${entries.length} entries exceed the cap\n`);

  for (const entry of oversized) {
    process.stdout.write(`  ${entry.title} (${entry.sizeMb} MB) … `);
    const better = await repick(entry.identifier);

    if (!better) {
      console.log('could not re-pick, leaving as is');
      continue;
    }

    entry.url = better.url;
    entry.sizeMb = better.sizeMb;
    console.log(`now ${better.sizeMb} MB`);
  }

  fs.writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);

  const remaining = entries.filter((e) => e.sizeMb * 1_000_000 > MAX_BYTES);
  const total = entries.reduce((sum, e) => sum + e.sizeMb, 0);
  console.log(`\n  ${entries.length} sources, ${remaining.length} still oversized`);
  console.log(`  median size: ${entries.map((e) => e.sizeMb).sort((a, b) => a - b)[Math.floor(entries.length / 2)]} MB`);
  console.log(`  total catalog: ${(total / 1000).toFixed(1)} GB`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
