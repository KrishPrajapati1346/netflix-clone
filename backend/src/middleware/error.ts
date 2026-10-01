import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError } from 'zod';
import type { ApiError as ApiErrorBody } from '@shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`No route matches ${req.method} ${req.path}`, 'ROUTE_NOT_FOUND'));
};

/**
 * The only place a failure becomes an HTTP response.
 *
 * Known failure shapes are translated into the shared error envelope; anything
 * unrecognised is logged with its stack and reported as a generic 500. Internal
 * messages never reach the client in production — an unhandled driver error can
 * contain a connection string, and a stack trace maps the source tree.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const normalized = normalize(error);

  const logPayload = {
    err: error,
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode: normalized.statusCode,
    code: normalized.code,
  };

  if (normalized.statusCode >= 500) {
    logger.error(logPayload, 'Request failed');
  } else {
    // Expected outcomes (401s, validation) are debug-level; logging them as
    // errors trains everyone to ignore the error log.
    logger.debug(logPayload, 'Request rejected');
  }

  const body: ApiErrorBody = {
    success: false,
    error: {
      code: normalized.code,
      message:
        normalized.statusCode >= 500 && env.isProduction
          ? 'Something went wrong on our end. Please try again.'
          : normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
  };

  res.status(normalized.statusCode).json(body);
};

function normalize(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_root';
      (details[key] ??= []).push(issue.message);
    }
    return ApiError.unprocessable('Please correct the highlighted fields', details);
  }

  if (error instanceof MongooseError.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [path, issue] of Object.entries(error.errors)) {
      (details[path] ??= []).push(issue.message);
    }
    return ApiError.unprocessable('Please correct the highlighted fields', details);
  }

  if (error instanceof MongooseError.CastError) {
    return ApiError.badRequest(`Invalid value for ${error.path}`, 'INVALID_ID');
  }

  // Duplicate key. Surfacing which field collided is useful and not sensitive.
  if (isMongoDuplicateKeyError(error)) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? 'field';
    return ApiError.conflict(`That ${field} is already taken`, 'DUPLICATE_KEY');
  }

  if (isBodyParserError(error)) {
    return ApiError.badRequest('Request body is not valid JSON', 'MALFORMED_JSON');
  }

  return ApiError.internal('Something went wrong', error);
}

function isMongoDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

function isBodyParserError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { type?: string }).type === 'entity.parse.failed'
  );
}
