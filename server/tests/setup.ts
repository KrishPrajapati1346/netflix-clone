import { afterAll, beforeAll, beforeEach } from 'vitest';

/**
 * Test bootstrap.
 *
 * `NODE_ENV` is set before any application module loads, because `config/env`
 * reads it at import time to pick the test database and disable rate limiting.
 * Importing the app first would connect the suite to the development database
 * and then wipe it between tests.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-not-used-anywhere-else';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-not-used-anywhere-else';
process.env.LOG_LEVEL = 'silent';

const { connectDatabase, disconnectDatabase, mongoose } = await import('../src/config/db');

beforeAll(async () => {
  await connectDatabase();
});

beforeEach(async () => {
  // Drop documents rather than the database itself: dropping would discard the
  // indexes Mongoose built at connect time, and the unique constraints under
  // test would silently stop being enforced.
  const collections = await mongoose.connection.db?.collections();
  await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await disconnectDatabase();
});
