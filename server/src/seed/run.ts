import crypto from 'node:crypto';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Profile } from '../models/Profile';
import { User, type UserDocument } from '../models/User';

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
  console.log('  ' + '─'.repeat(58) + '\n');

  await disconnectDatabase();
}

seed().catch(async (error: unknown) => {
  logger.error({ err: error }, 'Seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
