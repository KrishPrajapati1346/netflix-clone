import crypto from 'node:crypto';
import type { MaturityRating } from '@shared';

/**
 * Generated cover art, drawn as SVG.
 *
 * The catalog needs artwork to look like a product rather than a spreadsheet,
 * but real posters need a TMDB key this project does not assume you have.
 * Rather than shipping grey boxes or hotlinking images we have no rights to,
 * every title gets its own poster composed from its metadata. Same title, same
 * art, forever — no storage, no network, no cache invalidation.
 *
 * The composition follows how a real one-sheet is actually built, because that
 * is what makes it read as a poster instead of a coloured rectangle:
 *
 *   1. a graphic field — genre-driven, filling the top two thirds
 *   2. a vignette and bottom scrim, so type stays legible over any of it
 *   3. a title block in tight, heavy, uppercase type
 *   4. a billing block — director and cast, in the small-caps credit style
 *   5. a bottom rail with the year and certification
 *
 * `npm run seed:tmdb` sets a real `posterUrl` and this stops being consulted.
 */

/* ------------------------------------------------------------------ palette */

interface Palette {
  /** Deep field colour. */
  base: string;
  /** Lighter sweep, top of the gradient. */
  lift: string;
  /** Motif and title accent. */
  ink: string;
}

/**
 * One palette per genre family, chosen so white type clears WCAG AA over the
 * darkened lower third where the title actually sits.
 */
const PALETTES: Record<GenreFamily, Palette[]> = {
  horror: [
    { base: '#12060a', lift: '#5c1220', ink: '#ff5a5f' },
    { base: '#0d0b12', lift: '#3d1846', ink: '#c084fc' },
    { base: '#140806', lift: '#6b2409', ink: '#fb923c' },
  ],
  scifi: [
    { base: '#050b16', lift: '#0e3a5c', ink: '#38bdf8' },
    { base: '#0a0718', lift: '#2e1a6b', ink: '#a78bfa' },
    { base: '#04120f', lift: '#0d4f45', ink: '#2dd4bf' },
  ],
  noir: [
    { base: '#0a0a0c', lift: '#2b2b33', ink: '#e5e7eb' },
    { base: '#0c0a08', lift: '#3a2e22', ink: '#d6b370' },
  ],
  comedy: [
    { base: '#1a0d02', lift: '#8a4a06', ink: '#fbbf24' },
    { base: '#160616', lift: '#7a1550', ink: '#f472b6' },
    { base: '#0c1206', lift: '#3f6212', ink: '#a3e635' },
  ],
  animation: [
    { base: '#07101c', lift: '#1d4ed8', ink: '#60a5fa' },
    { base: '#101006', lift: '#a16207', ink: '#fde047' },
    { base: '#120616', lift: '#7e22ce', ink: '#e879f9' },
  ],
  western: [{ base: '#1a0e04', lift: '#a1600e', ink: '#fcd34d' }],
  documentary: [
    { base: '#0a0d10', lift: '#27333d', ink: '#94a3b8' },
    { base: '#0d0c08', lift: '#3b3626', ink: '#d4c69a' },
  ],
  drama: [
    { base: '#0b0810', lift: '#3b2a5c', ink: '#c4b5fd' },
    { base: '#08100f', lift: '#1f4d47', ink: '#5eead4' },
    { base: '#100a08', lift: '#5c3520', ink: '#fdba74' },
  ],
};

type GenreFamily =
  | 'horror'
  | 'scifi'
  | 'noir'
  | 'comedy'
  | 'animation'
  | 'western'
  | 'documentary'
  | 'drama';

/** Every genre's visual family, used when it is the leading genre. */
const GENRE_FAMILY: Record<string, GenreFamily> = {
  Horror: 'horror',
  Animation: 'animation',
  'Science Fiction': 'scifi',
  Fantasy: 'scifi',
  Western: 'western',
  Documentary: 'documentary',
  History: 'documentary',
  War: 'documentary',
  Crime: 'noir',
  Mystery: 'noir',
  Thriller: 'noir',
  Comedy: 'comedy',
  Romance: 'comedy',
  Music: 'comedy',
  Family: 'animation',
  Drama: 'drama',
  Action: 'drama',
  Adventure: 'drama',
};

/**
 * Genres whose look dominates a poster regardless of billing order.
 *
 * A horror comedy is sold as horror and an animated thriller is sold as
 * animation — those four override position. Everything else defers to the
 * order the genres were authored in, because the first-listed genre is the
 * primary one and that is a judgement worth respecting rather than overriding
 * with a fixed precedence table. (Without this, *The General* — "Comedy,
 * Action, War" — was drawn as a war documentary.)
 */
const DOMINANT: readonly string[] = ['Horror', 'Animation', 'Science Fiction', 'Western'];

function familyFor(genres: readonly string[]): GenreFamily {
  const dominant = genres.find((genre) => DOMINANT.includes(genre));
  if (dominant) return GENRE_FAMILY[dominant] ?? 'drama';

  for (const genre of genres) {
    const family = GENRE_FAMILY[genre];
    if (family) return family;
  }
  return 'drama';
}

/* --------------------------------------------------------------- utilities */

/** Stable 32-bit hash, so a slug always yields the same artwork. */
function hash(input: string): number {
  return crypto.createHash('sha256').update(input).digest().readUInt32BE(0);
}

/** Deterministic pseudo-random sequence seeded from the slug. */
function sequence(seed: number) {
  let state = seed || 1;
  return () => {
    // xorshift32 — small, fast, and good enough for placing decorative shapes.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10_000) / 10_000;
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Greedy word wrap by character budget.
 *
 * SVG has no text wrapping, so lines must be computed and emitted as separate
 * `<tspan>` elements. A word longer than the budget gets its own line rather
 * than being hyphenated — film titles rarely need it, and a bad break is worse
 * than a short line.
 */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

/* ------------------------------------------------------------------ motifs */

/**
 * The graphic field, one per genre family.
 *
 * Each is built from primitives that suggest the genre without illustrating it
 * — a moon and bare branches for horror, orbital rings for science fiction,
 * venetian-blind slats for noir. Abstraction is the point: a generated poster
 * that tries to depict a specific scene looks wrong, one that sets a mood does
 * not.
 */
function motif(family: GenreFamily, palette: Palette, width: number, height: number, rand: () => number): string {
  const { ink } = palette;
  const cx = width / 2;

  switch (family) {
    case 'horror': {
      // A low moon behind bare branches.
      const moonY = height * 0.3;
      const branches = Array.from({ length: 7 }, () => {
        const x = width * (0.05 + rand() * 0.9);
        const sway = (rand() - 0.5) * 90;
        return `<path d="M${x.toFixed(0)} ${height} Q${(x + sway).toFixed(0)} ${(height * 0.6).toFixed(0)} ${(x + sway * 1.8).toFixed(0)} ${(height * 0.26).toFixed(0)}"
          stroke="#000" stroke-opacity="0.55" stroke-width="${(3 + rand() * 5).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      }).join('');

      return `
        <circle cx="${cx}" cy="${moonY}" r="${width * 0.27}" fill="${ink}" fill-opacity="0.9"/>
        <circle cx="${cx}" cy="${moonY}" r="${width * 0.27}" fill="url(#moonShade)"/>
        <circle cx="${cx}" cy="${moonY}" r="${width * 0.42}" fill="${ink}" fill-opacity="0.08"/>
        ${branches}`;
    }

    case 'scifi': {
      // Orbital ellipses over a receding horizon grid.
      const rings = Array.from({ length: 3 }, (_, i) => {
        const ry = width * (0.16 + i * 0.1);
        return `<ellipse cx="${cx}" cy="${height * 0.33}" rx="${(ry * 2.1).toFixed(0)}" ry="${ry.toFixed(0)}"
          fill="none" stroke="${ink}" stroke-opacity="${(0.5 - i * 0.13).toFixed(2)}" stroke-width="${2 + i}"
          transform="rotate(${(-18 + i * 7).toFixed(0)} ${cx} ${(height * 0.33).toFixed(0)})"/>`;
      }).join('');

      const grid = Array.from({ length: 9 }, (_, i) => {
        // Lines converge on a vanishing point for depth.
        const y = height * 0.62 + (i * i) * (height * 0.006);
        return y < height
          ? `<line x1="0" y1="${y.toFixed(0)}" x2="${width}" y2="${y.toFixed(0)}" stroke="${ink}" stroke-opacity="0.14" stroke-width="1.5"/>`
          : '';
      }).join('');

      return `
        <circle cx="${cx}" cy="${height * 0.33}" r="${width * 0.15}" fill="${ink}" fill-opacity="0.16"/>
        ${rings}${grid}`;
    }

    case 'noir': {
      // Venetian-blind light across the frame — the genre's whole visual idiom.
      const slats = Array.from({ length: 16 }, (_, i) => {
        const y = height * 0.04 + i * (height * 0.048);
        return `<rect x="-${width * 0.2}" y="${y.toFixed(0)}" width="${width * 1.4}" height="${(height * 0.018).toFixed(0)}"
          fill="${ink}" fill-opacity="${(0.16 - i * 0.006).toFixed(3)}"/>`;
      }).join('');

      return `<g transform="rotate(-11 ${cx} ${(height * 0.35).toFixed(0)})">${slats}</g>
        <circle cx="${(width * 0.74).toFixed(0)}" cy="${(height * 0.2).toFixed(0)}" r="${width * 0.2}" fill="${ink}" fill-opacity="0.07"/>`;
    }

    case 'animation': {
      // Overlapping soft blobs — buoyant rather than ominous.
      return Array.from({ length: 6 }, () => {
        const r = width * (0.1 + rand() * 0.22);
        return `<circle cx="${(width * rand()).toFixed(0)}" cy="${(height * 0.55 * rand()).toFixed(0)}" r="${r.toFixed(0)}"
          fill="${ink}" fill-opacity="${(0.1 + rand() * 0.18).toFixed(2)}"/>`;
      }).join('');
    }

    case 'western': {
      // Low sun over a hard horizon.
      const horizon = height * 0.46;
      return `
        <circle cx="${cx}" cy="${(horizon - width * 0.06).toFixed(0)}" r="${width * 0.3}" fill="${ink}" fill-opacity="0.85"/>
        <rect x="0" y="${horizon.toFixed(0)}" width="${width}" height="${(height - horizon).toFixed(0)}" fill="#000" fill-opacity="0.42"/>
        <path d="M0 ${horizon} L${width * 0.28} ${(horizon - width * 0.12).toFixed(0)} L${width * 0.46} ${horizon} Z" fill="#000" fill-opacity="0.5"/>
        <path d="M${width * 0.42} ${horizon} L${width * 0.72} ${(horizon - width * 0.18).toFixed(0)} L${width} ${horizon} Z" fill="#000" fill-opacity="0.6"/>`;
    }

    case 'documentary': {
      // A measured rule grid — archival, deliberately unglamorous.
      const rules = Array.from({ length: 22 }, (_, i) => {
        const y = height * 0.05 + i * (height * 0.025);
        return `<line x1="${(width * 0.08).toFixed(0)}" y1="${y.toFixed(0)}" x2="${(width * (0.35 + rand() * 0.57)).toFixed(0)}" y2="${y.toFixed(0)}"
          stroke="${ink}" stroke-opacity="${(0.08 + rand() * 0.12).toFixed(2)}" stroke-width="2"/>`;
      }).join('');

      return `${rules}
        <rect x="${(width * 0.08).toFixed(0)}" y="${(height * 0.05).toFixed(0)}" width="${(width * 0.84).toFixed(0)}" height="${(height * 0.55).toFixed(0)}"
          fill="none" stroke="${ink}" stroke-opacity="0.2" stroke-width="2"/>`;
    }

    case 'drama': {
      /*
        Vertical light shafts through a soft haze.
        Deliberately *not* the comedy arcs: drama is the fallback family, so it
        would otherwise be the most common look on the page, and sharing a motif
        with comedy made a third of the catalog interchangeable at a glance.
      */
      const shafts = Array.from({ length: 5 }, (_, i) => {
        const x = width * (0.08 + i * 0.2 + rand() * 0.06);
        const w = width * (0.05 + rand() * 0.09);
        const skew = (rand() - 0.5) * width * 0.14;
        return `<path d="M${x.toFixed(0)} 0 L${(x + w).toFixed(0)} 0 L${(x + w + skew).toFixed(0)} ${height} L${(x + skew).toFixed(0)} ${height} Z"
          fill="${ink}" fill-opacity="${(0.05 + rand() * 0.08).toFixed(3)}"/>`;
      }).join('');

      return `${shafts}
        <ellipse cx="${(width * (0.3 + rand() * 0.4)).toFixed(0)}" cy="${(height * 0.28).toFixed(0)}"
          rx="${(width * 0.46).toFixed(0)}" ry="${(height * 0.2).toFixed(0)}" fill="${ink}" fill-opacity="0.1"/>`;
    }

    case 'comedy':
    default: {
      // Concentric arcs sweeping off-frame — open and warm. The origin moves
      // per title so two comedies never resolve to the same composition.
      const cxr = width * (0.14 + rand() * 0.5);
      const cyr = height * (0.16 + rand() * 0.26);

      return Array.from({ length: 5 }, (_, i) => {
        const r = width * (0.2 + i * 0.16);
        return `<circle cx="${cxr.toFixed(0)}" cy="${cyr.toFixed(0)}" r="${r.toFixed(0)}"
          fill="none" stroke="${ink}" stroke-opacity="${(0.26 - i * 0.045).toFixed(2)}" stroke-width="${(width * 0.035).toFixed(0)}"/>`;
      }).join('');
    }
  }
}

/* ------------------------------------------------------------------- entry */

export interface ArtworkOptions {
  slug: string;
  title: string;
  /** 2:3 poster, or 16:9 backdrop. */
  shape: 'poster' | 'backdrop';
  year?: number | null;
  genres?: readonly string[];
  directors?: readonly string[];
  cast?: readonly { name: string }[];
  maturityRating?: MaturityRating | null;
}

export function generateArtwork({
  slug,
  title,
  shape,
  year,
  genres = [],
  directors = [],
  cast = [],
  maturityRating,
}: ArtworkOptions): string {
  const seed = hash(slug);
  const rand = sequence(seed);

  const family = familyFor(genres);
  const options = PALETTES[family];
  const palette = options[seed % options.length] ?? options[0]!;

  const isPoster = shape === 'poster';
  const width = isPoster ? 600 : 1280;
  const height = isPoster ? 900 : 720;

  /**
   * Only posters carry type.
   *
   * A backdrop is always rendered *underneath* the UI's own headline — on the
   * hero and the detail banner — so text baked into the image would collide
   * with it and print the title twice. The backdrop is pure atmosphere; the
   * page supplies the words.
   */
  const graphic = motif(family, palette, width, height, rand);

  const grainOpacity = isPoster ? 0.055 : 0.04;
  const angle = 150 + ((seed >> 8) % 60);

  let typography = '';

  if (isPoster) {
    // Fit the title to the plate: fewer characters per line means bigger type,
    // which is what gives short titles their poster-like punch.
    const words = title.toUpperCase().split(/\s+/);
    const longest = Math.max(...words.map((w) => w.length), 1);
    const perLine = Math.max(longest, title.length > 22 ? 12 : 10);
    const lines = wrap(title.toUpperCase(), perLine, 3);

    const widest = Math.max(...lines.map((l) => l.length), 1);
    // 0.62 approximates the advance width of a heavy sans at this weight.
    const fontSize = Math.min(78, Math.max(30, (width - 112) / (widest * 0.62)));
    const lineHeight = fontSize * 0.96;

    const billing = [
      directors.length > 0 ? `Directed by ${directors.slice(0, 2).join(' & ')}` : null,
      cast.length > 0 ? cast.slice(0, 3).map((member) => member.name).join(' · ') : null,
    ].filter(Boolean) as string[];

    // Lay the block out from the bottom up so the rail, billing and title stack
    // without overlapping regardless of how many lines the title needed.
    const railY = height - 46;
    const billingBottom = railY - 40;
    const billingLines = billing.map((line, index) =>
      `<text x="56" y="${billingBottom - (billing.length - 1 - index) * 22}" fill="#ffffff" fill-opacity="0.66"
        font-family="Inter, Helvetica, Arial, sans-serif" font-size="16" font-weight="500" letter-spacing="0.5">${escapeXml(line)}</text>`,
    ).join('');

    const titleBottom = billingBottom - billing.length * 22 - 26;
    const tspans = lines
      .map((line, index) => {
        const y = titleBottom - (lines.length - 1 - index) * lineHeight;
        return `<tspan x="56" y="${y.toFixed(1)}">${escapeXml(line)}</tspan>`;
      })
      .join('');

    const genreLine = genres.slice(0, 3).join(' · ').toUpperCase();
    const genreY = titleBottom - lines.length * lineHeight - 6;

    typography = `
      <rect x="56" y="${(genreY - 34).toFixed(0)}" width="46" height="4" fill="${palette.ink}"/>
      ${
        genreLine
          ? `<text x="56" y="${genreY.toFixed(0)}" fill="${palette.ink}" font-family="Inter, Helvetica, Arial, sans-serif"
              font-size="14" font-weight="700" letter-spacing="3.4">${escapeXml(genreLine)}</text>`
          : ''
      }
      <text fill="#ffffff" font-family="Inter, Helvetica, Arial, sans-serif" font-size="${fontSize.toFixed(1)}"
        font-weight="800" letter-spacing="${(-fontSize * 0.035).toFixed(2)}">${tspans}</text>
      ${billingLines}
      <line x1="56" y1="${(railY - 22).toFixed(0)}" x2="${width - 56}" y2="${(railY - 22).toFixed(0)}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1"/>
      ${
        year
          ? `<text x="56" y="${railY}" fill="#ffffff" fill-opacity="0.72" font-family="Inter, Helvetica, Arial, sans-serif"
              font-size="15" font-weight="600" letter-spacing="2.5">${year}</text>`
          : ''
      }
      ${
        maturityRating
          ? `<g transform="translate(${width - 56 - 46} ${railY - 17})">
               <rect width="46" height="22" rx="3" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.5"/>
               <text x="23" y="16" text-anchor="middle" fill="#ffffff" fill-opacity="0.82"
                 font-family="Inter, Helvetica, Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(maturityRating)}</text>
             </g>`
          : ''
      }`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="field" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${palette.lift}"/>
      <stop offset="55%" stop-color="${palette.base}"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="moonShade" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.78">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.94"/>
      <stop offset="${isPoster ? '46%' : '58%'}" stop-color="#000000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
    <!-- Fractal noise reads as film grain and stops the flat fills looking synthetic. -->
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed % 100}" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#field)"/>
  ${graphic}
  <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  <rect width="${width}" height="${height}" fill="url(#scrim)"/>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity="${grainOpacity}"/>
  ${typography}
</svg>`;
}
