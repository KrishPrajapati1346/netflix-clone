import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { type ZodError, type ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates a request against Zod schemas and stashes the *parsed* result.
 *
 * The parsed output matters as much as the validation: `?page=2` arrives as the
 * string "2" and comes out of `paginationSchema` as the number 2, with defaults
 * applied. Handlers read `req.validated`, never the raw input, so coercion
 * happens exactly once at the boundary.
 *
 * Express 5 exposes `req.query` as a getter without a setter, so overwriting it
 * in place is not an option — hence the separate `validated` bag rather than
 * the mutate-in-place pattern common in Express 4 codebases.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const validated: Record<string, unknown> = {};
    const errors: Record<string, string[]> = {};

    for (const source of ['body', 'query', 'params'] as Source[]) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);
      if (result.success) {
        validated[source] = result.data;
      } else {
        collectIssues(result.error, errors);
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(ApiError.unprocessable('Please correct the highlighted fields', errors));
    }

    req.validated = validated;
    next();
  };
}

/** Reads a validated body with the schema's inferred type. */
export function body<T>(req: Request): T {
  return req.validated?.body as T;
}

export function query<T>(req: Request): T {
  return req.validated?.query as T;
}

export function params<T>(req: Request): T {
  return req.validated?.params as T;
}

/**
 * Flattens Zod issues into `{ fieldPath: [messages] }`.
 *
 * React Hook Form consumes this shape directly, so a 422 can be mapped onto
 * per-field errors on the client without any translation layer.
 */
function collectIssues(error: ZodError, into: Record<string, string[]>): void {
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    const bucket = into[key] ?? (into[key] = []);
    bucket.push(issue.message);
  }
}
