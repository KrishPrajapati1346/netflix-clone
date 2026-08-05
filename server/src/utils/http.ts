import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, Paginated } from '@kinora/shared';

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
