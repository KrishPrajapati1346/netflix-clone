import pino from 'pino';
import { env } from './env';

/**
 * Structured logging. Pretty-printed in development for readability, plain
 * JSON everywhere else so Render's log drain can parse it.
 *
 * The redact list is not decorative — `req.headers.cookie` carries the refresh
 * token and `authorization` carries the access token, and pino-http logs whole
 * request objects on error.
 */
export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'currentPassword',
      'confirmPassword',
      'token',
      'refreshToken',
      'accessToken',
      'pin',
      '*.password',
      '*.token',
    ],
    censor: '[redacted]',
  },
  ...(env.isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export type Logger = typeof logger;
