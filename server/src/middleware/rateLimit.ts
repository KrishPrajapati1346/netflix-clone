import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * Builds the IP half of a composite rate-limit key.
 *
 * `ipKeyGenerator` normalises an IPv6 address down to its /64 prefix. Keying on
 * the raw address instead would make the limit trivially bypassable: a single
 * IPv6 allocation hands one client billions of distinct source addresses, so
 * "10 attempts per IP" becomes effectively unlimited. IPv4 is returned as-is.
 */
function ipKey(req: Request): string {
  return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

/** Reads a lowercase email from the body, when the route has one. */
function emailKey(req: Request, prefix: string): string | null {
  const email = (req.body as { email?: unknown })?.email;
  return typeof email === 'string' && email.length > 0 ? `${prefix}:${email.toLowerCase()}` : null;
}

/**
 * Rate limiting.
 *
 * The store is in-memory, which is the honest choice for a single free-tier
 * Render dyno: counters reset on restart and would not be shared across
 * instances. Horizontal scaling needs a Redis store — called out in the README
 * rather than pretended away.
 */

function build(options: Partial<Options> & { windowMs: number; limit: number }) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Lifting the limits under test keeps a fast-running suite from tripping
    // them and producing confusing failures.
    skip: () => env.isTest,
    handler: (_req, _res, next, opts) => {
      const seconds = Math.ceil(opts.windowMs / 1000);
      next(
        ApiError.tooManyRequests(
          `Too many requests. Please wait ${seconds >= 60 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`} and try again.`,
        ),
      );
    },
    ...options,
  });
}

/** Broad backstop applied to the whole API. */
export const globalLimiter = build({
  windowMs: 60 * 1000,
  limit: 300,
});

/**
 * Per-IP limit on credential endpoints. Tight, because these are the endpoints
 * worth brute-forcing.
 */
export const authLimiter = build({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

/**
 * Per-account limit, keyed on the submitted email rather than the IP.
 *
 * IP limiting alone is defeated by a botnet spreading attempts across many
 * addresses; account limiting alone is defeated by one host spraying many
 * accounts. Running both closes each other's gap. This is the second of the
 * three layers — `User.failedLoginAttempts` provides durable lockout that
 * survives a process restart.
 */
export const perAccountAuthLimiter = build({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req: Request) => emailKey(req, 'acct') ?? ipKey(req),
});

/** Password reset and verification resend both send mail; keep them cheap to serve. */
export const emailDispatchLimiter = build({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req: Request) => emailKey(req, 'mail') ?? ipKey(req),
});

/** Uploads are expensive in bandwidth and Cloudinary quota. */
export const uploadLimiter = build({
  windowMs: 60 * 60 * 1000,
  limit: 30,
});

/** Search hits the database on every keystroke-debounce; keep it bounded. */
export const searchLimiter = build({
  windowMs: 60 * 1000,
  limit: 120,
});

/** Writes that create user-visible content, to blunt spam. */
export const writeLimiter = build({
  windowMs: 60 * 1000,
  limit: 40,
});
