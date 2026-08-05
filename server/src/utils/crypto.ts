import crypto from 'node:crypto';

/**
 * Single-use secret helper.
 *
 * Verification links, password resets and refresh tokens all follow the same
 * pattern: hand the user a high-entropy random string, store only its SHA-256
 * digest. A database leak then yields hashes that cannot be replayed, and
 * lookup stays a single indexed equality match (unlike bcrypt, which would
 * force a scan). SHA-256 is appropriate here precisely because the input is
 * already 256 bits of entropy — there is nothing to brute-force.
 */
export function generateSecret(bytes = 40): { token: string; hash: string } {
  const token = crypto.randomBytes(bytes).toString('base64url');
  return { token, hash: hashSecret(token) };
}

export function hashSecret(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Constant-time compare that tolerates length mismatch without throwing. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function randomId(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}
