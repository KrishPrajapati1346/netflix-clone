import crypto from 'node:crypto';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Profile } from '../models/Profile';
import { User, type UserDocument } from '../models/User';
import { seedCatalog, seedRatings } from './catalog';

/**
 * Idempotent database seed.
 *
 * Running it twice must not produce duplicate accounts or reset a password
 * someone is already using, so every step is an upsert-style "create if
 * missing". That makes it safe to re-run after a schema change, which is when
 * you actually want to run it.
 *
 * Catalog seeding (movies, shows, episodes) is added in Phase 2; this covers
 * the accounts Phase 1 needs.
 */

interface SeedAccount {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  generated: boolean;
}

/** Meets the shared password policy: length, upper, lower, digit. */
function generatePassword(): string {
  const raw = crypto.randomBytes(12).toString('base64url').replace(/[^A-Za-z0-9]/g, '');
  return `Kn${raw.slice(0, 12)}7a`;
}

async function ensureAccount(spec: SeedAccount): Promise<{ user: UserDocument; created: boolean }> {
  const existing = await User.findOne({ email: spec.email }).select('+passwordHash');
  if (existing) return { user: existing, created: false };

  const user = new User({
    name: spec.name,
    email: spec.email,
    role: spec.role,
    // Seeded accounts skip the mailbox round-trip; there is no inbox to check.
    isEmailVerified: true,
  });
  await user.setPassword(spec.password);
  await user.save();

  await Profile.create({
    userId: user._id,
    name: spec.name.split(' ')[0]?.slice(0, 30) ?? spec.name.slice(0, 30),
    avatarKey: spec.role === 'admin' ? 'aurora' : 'ember',
  });

  return { user, created: true };
}

async function seed(): Promise<void> {
  await connectDatabase();

  const adminPassword = env.SEED_ADMIN_PASSWORD ?? generatePassword();
  const demoPassword = 'KinoraDemo2026!';

  const accounts: SeedAccount[] = [
    {
      name: 'Kinora Admin',
      email: env.SEED_ADMIN_EMAIL ?? 'admin@kinora.local',
      password: adminPassword,
      role: 'admin',
      generated: !env.SEED_ADMIN_PASSWORD,
    },
    {
      name: 'Demo Viewer',
      email: 'demo@kinora.local',
      password: demoPassword,
      role: 'user',
      generated: false,
    },
  ];

  const results: Array<{ spec: SeedAccount; created: boolean }> = [];
  for (const spec of accounts) {
    const { created } = await ensureAccount(spec);
    results.push({ spec, created });
  }

  // `npm run seed -- --reset` makes the fixtures authoritative, removing titles
  // that were dropped from them (and anything added through the admin panel).
  const reset = process.argv.includes('--reset');
  if (reset) {
    // eslint-disable-next-line no-console
    console.log('\n  --reset: clearing the existing catalog first');
  }
  const catalog = await seedCatalog({ reset });

  // A second profile on the demo account, so the "two profiles see different
  // homepages" behaviour can be demonstrated without creating one by hand.
  const demoUser = await User.findOne({ email: 'demo@kinora.local' });
  if (demoUser) {
    const existingKids = await Profile.findOne({ userId: demoUser._id, name: 'Kids' });
    if (!existingKids) {
      await Profile.create({
        userId: demoUser._id,
        name: 'Kids',
        avatarKey: 'coral',
        isKids: true,
        maturityLimit: 'PG',
      });
    }
  }

  const profiles = await Profile.find().select('_id').lean();
  const ratings = await seedRatings(profiles.map((p) => p._id));

  // eslint-disable-next-line no-console
  console.log('\n  Kinora seed complete\n  ' + '─'.repeat(58));
  for (const { spec, created } of results) {
    // eslint-disable-next-line no-console
    console.log(
      `  ${created ? 'created' : 'exists '}  ${spec.role.padEnd(5)}  ${spec.email}\n` +
        `            password: ${created ? spec.password : '(unchanged — account already existed)'}`,
    );
  }

  if (results.some((r) => r.created && r.spec.generated)) {
    // eslint-disable-next-line no-console
    console.log(
      '\n  The admin password above was generated and is shown only once.\n' +
        '  Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env to choose your own.',
    );
  }
  // eslint-disable-next-line no-console
  console.log(
    `\n  Catalog: ${catalog.movies} movies, ${catalog.shows} series ` +
      `(${catalog.seasons} seasons, ${catalog.episodes} episodes)\n` +
      `  Seeded ${ratings} ratings across ${profiles.length} profiles so the\n` +
      '  recommender has real signal rather than an empty collection.',
  );
  // eslint-disable-next-line no-console
  console.log('  ' + '─'.repeat(58) + '\n');

  await disconnectDatabase();
}

seed().catch(async (error: unknown) => {
  logger.error({ err: error }, 'Seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
