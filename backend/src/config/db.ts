import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

/**
 * Mongoose connection lifecycle.
 *
 * `strictQuery` keeps stray filter keys from silently matching everything,
 * which is the difference between "no results" and "returned the whole
 * collection" when a typo sneaks into a query object.
 */
mongoose.set('strictQuery', true);

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connecting) return connecting;

  connecting = mongoose
    .connect(uri, {
      // Fail fast rather than hanging a request for 30s when Atlas is asleep.
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
      autoIndex: !env.isProduction,
    })
    .then((m) => {
      logger.info({ host: m.connection.host, db: m.connection.name }, 'MongoDB connected');
      return m;
    })
    .catch((error: unknown) => {
      connecting = null;
      throw error;
    });

  return connecting;
}

export async function disconnectDatabase(): Promise<void> {
  connecting = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

mongoose.connection.on('error', (error) => {
  logger.error({ err: error }, 'MongoDB connection error');
});

mongoose.connection.on('disconnected', () => {
  if (!env.isTest) logger.warn('MongoDB disconnected');
});

export { mongoose };
