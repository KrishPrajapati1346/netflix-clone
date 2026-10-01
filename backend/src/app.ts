import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { allowedOrigins, env } from './config/env';
import { logger } from './config/logger';
import { configurePassport, passport } from './config/passport';
import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import { sanitizeRequest } from './middleware/sanitize';
import { apiRoutes } from './routes';
import { randomId } from './utils/crypto';

export const API_PREFIX = '/api/v1';

/**
 * Builds the Express application.
 *
 * Kept separate from `server.ts` so tests can mount the app against a test
 * database without binding a port or starting Socket.IO.
 *
 * Middleware order is load-bearing and roughly: identify -> protect -> parse ->
 * sanitise -> route -> handle errors. Rate limiting sits before body parsing so
 * a flood costs us a counter increment rather than a JSON parse.
 */
export function createApp(): Express {
  const app = express();

  // Render/Vercel terminate TLS upstream. Without this, `req.ip` is the proxy's
  // address — which would make per-IP rate limiting count every user as one,
  // and `secure` cookies would never be recognised as such.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((req, _res, next) => {
    req.id = randomId(8);
    next();
  });

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { id?: string }).id ?? randomId(8),
      autoLogging: {
        // Health checks would otherwise dominate the log on a keep-alive pinger.
        ignore: (req) => req.url === `${API_PREFIX}/health`,
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'debug';
        return 'info';
      },
    }),
  );

  app.use(
    helmet({
      // The API serves JSON, not HTML, so a page CSP is not the right tool here
      // — the client sets its own. This blocks the API being framed.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(
    cors({
      /**
       * Allow-list, not a reflector. `credentials: true` means the browser will
       * send the refresh cookie, and a wildcard origin combined with
       * credentials is exactly the configuration that turns CORS into CSRF.
       */
      origin(origin, callback) {
        // Same-origin requests, curl and server-to-server calls send no Origin.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);

        logger.warn({ origin }, 'Blocked cross-origin request');
        callback(new Error('Origin not allowed by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Kinora-Profile'],
      exposedHeaders: ['RateLimit', 'RateLimit-Policy'],
      maxAge: 86400,
    }),
  );

  app.use(globalLimiter);

  // 100kb is generous for JSON here; uploads go through multer, not this parser.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);

  configurePassport();
  app.use(passport.initialize());

  app.get('/', (_req, res) => {
    res.json({
      name: 'Kinora API',
      version: '1.0.0',
      docs: `${API_PREFIX}/health`,
      environment: env.NODE_ENV,
    });
  });

  app.use(API_PREFIX, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
