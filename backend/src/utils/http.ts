import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, Paginated } from '@shared';

/**
 * Wraps an async handler so a rejected promise reaches the error middleware.
 *
 * Express 5 forwards rejections on its own, but keeping this explicit means the
 * behaviour does not silently depend on the Express major version.
 *
 * Deliberately not generic over the request: handlers read validated input from
 * `req.validated` (see `middleware/validate.ts`), so parameterising `ReqQuery`
 * here would buy nothing and fights Express's own `ParsedQs` defaults.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Reads a single route parameter as a string.
 *
 * Express 5 types `req.params` values as `string | string[]`, because a route
 * pattern can bind a parameter more than once. Every route here binds each
 * parameter exactly once, so this narrows in one place rather than making every
 * controller deal with an array case that cannot occur.
 */
export function param(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Every 2xx body goes through here, so the envelope can never drift per-route. */
export function sendData<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}
