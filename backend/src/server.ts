import http from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env, features } from './config/env';
import { logger } from './config/logger';
import { createSocketServer } from './sockets';

/**
 * Process entry point: connect, listen, and shut down cleanly.
 *
 * Graceful shutdown matters on Render, which sends SIGTERM before replacing an
 * instance. Draining in-flight requests before closing Mongo avoids a burst of
 * user-visible 502s on every deploy.
 */
async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  // Socket.IO shares the HTTP server rather than binding its own port: free
  // tiers expose exactly one, and a separate port would need its own TLS and
  // its own CORS story.
  const io = createSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        features,
      },
      `Kinora API listening on http://localhost:${env.PORT}`,
    );

    if (env.usingGeneratedSecrets) {
      logger.warn(
        'JWT secrets were generated for this process. Sessions will not survive a restart — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env to persist them.',
      );
    }
    if (!features.email) {
      logger.warn(
        'SMTP is not configured. Verification and reset links are logged here and returned in API responses (development only).',
      );
    }
  });

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    // Stop accepting connections, then wait for in-flight requests to finish.
    // Close sockets first so clients get a clean disconnect and reconnect to
    // the replacement instance, rather than hanging until ping timeout.
    await io.close();

    server.close(async () => {
      await disconnectDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Backstop: never hang a deploy on a stuck socket.
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    void shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    // The process is in an undefined state here; log and let the platform
    // restart it rather than limping along.
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
