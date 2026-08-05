/**
 * The single error type controllers and services throw.
 *
 * Carrying `statusCode` and a stable machine-readable `code` on the error means
 * the error middleware is the only place that knows how to serialise a failure,
 * and clients can branch on `code` instead of parsing English.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  /** Expected failures (401, 404, validation) are noise at error level. */
  readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options: { details?: Record<string, string[]>; cause?: unknown; isOperational?: boolean } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST') {
    return new ApiError(400, code, message);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'You do not have access to this resource', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, code, message);
  }

  static conflict(message = 'Resource already exists', code = 'CONFLICT') {
    return new ApiError(409, code, message);
  }

  static unprocessable(message = 'Validation failed', details?: Record<string, string[]>) {
    return new ApiError(422, 'VALIDATION_ERROR', message, { details });
  }

  static tooManyRequests(message = 'Too many requests, please slow down') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Something went wrong', cause?: unknown) {
    return new ApiError(500, 'INTERNAL_ERROR', message, { cause, isOperational: false });
  }

  static serviceUnavailable(message: string, code = 'FEATURE_UNAVAILABLE') {
    return new ApiError(503, code, message);
  }
}
