/** Combining diacritical marks, stripped after NFD normalisation. */
const COMBINING_MARKS = /[̀-ͯ]/g;
const APOSTROPHES = /['‘’]/g;

/**
 * Slug generation for title URLs (`/title/the-quiet-shore`).
 *
 * Normalises to NFD first so accented characters degrade to their base letter
 * ("Amélie" -> "amelie") instead of being dropped entirely.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/**
 * Appends a disambiguating suffix until the slug is free.
 *
 * `exists` is injected rather than hardcoded to a model so movies and shows can
 * share one implementation while keeping separate uniqueness namespaces.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'untitled';
  if (!(await exists(root))) return root;

  for (let suffix = 2; suffix < 500; suffix++) {
    const candidate = `${root}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
