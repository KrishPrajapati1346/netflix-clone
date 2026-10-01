import type { RequestHandler } from 'express';
import { logger } from '../config/logger';

/**
 * Strips MongoDB operator keys from request payloads.
 *
 * Without this, a body of `{ "email": { "$gt": "" } }` reaches a `findOne` as a
 * query operator and matches the first user in the collection. Zod validation
 * already blocks this on every route that declares a schema — an object is not
 * a string — but this runs first and unconditionally, so a route added later
 * without a validator is not a fresh injection point.
 *
 * Written by hand rather than using `express-mongo-sanitize`: that package
 * reassigns `req.query`, which Express 5 exposes as a getter-only property, so
 * it throws on boot. Mutating only `req.body` (still a plain writable object)
 * and leaving `req.query` to the validators sidesteps that entirely.
 */

const FORBIDDEN_KEY = /^\$|\./;
const MAX_DEPTH = 12;

function scrub(value: unknown, depth: number, onStrip: (key: string) => void): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((entry) => scrub(entry, depth + 1, onStrip));
  }

  // Reject prototype-poisoning vectors outright rather than sanitising them.
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      onStrip(key);
      continue;
    }
    if (FORBIDDEN_KEY.test(key)) {
      onStrip(key);
      continue;
    }
    result[key] = scrub(source[key], depth + 1, onStrip);
  }

  return result;
}

export const sanitizeRequest: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    const stripped: string[] = [];
    req.body = scrub(req.body, 0, (key) => stripped.push(key));

    if (stripped.length > 0) {
      logger.warn(
        { path: req.path, ip: req.ip, keys: stripped },
        'Stripped MongoDB operator keys from request body',
      );
    }
  }
  next();
};
