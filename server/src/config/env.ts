import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

/**
 * Loads the repository-root `.env` before anything reads `process.env`.
 *
 * Uses Node's built-in loader (20.12+) rather than the `dotenv` package — one
 * fewer dependency for something the runtime now does natively. Real
 * environment variables always win, because the platform (Render, CI) sets
 * those and a stray committed file must never override them.
 */
function loadEnvFile(): void {
  // `__dirname` is server/src/config in dev and server/dist/config after build,
  // so walk up to the repo root rather than assuming a fixed depth.
  const candidates = [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      process.loadEnvFile(candidate);
    } catch {
      // A malformed .env should not be fatal — validation below reports what
      // is actually missing, which is a far more useful error.
    }
    return;
  }
}

loadEnvFile();

/**
 * Environment loading and validation.
 *
 * Two rules drive the design here:
 *
 *  1. The server must boot with an empty `.env` in development, so a reviewer
 *     can `git clone && npm run dev` without signing up for anything. Optional
 *     integrations become *feature flags* rather than crash-on-boot requirements.
 *  2. Production must never boot half-configured. Anything that is merely
 *     "optional" in dev is promoted to required in production, and secrets are
 *     rejected outright if they are still the generated dev defaults.
 */

const isTest = process.env.NODE_ENV === 'test';

/** Treat empty strings from a half-filled `.env` as "not set". */
const optionalString = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/kinora'),
  MONGODB_URI_TEST: z.string().default('mongodb://127.0.0.1:27017/kinora_test'),

  JWT_ACCESS_SECRET: optionalString,
  JWT_REFRESH_SECRET: optionalString,

  CLIENT_URL: z.string().default('http://localhost:3000'),
  SERVER_URL: z.string().default('http://localhost:4000'),
  /** Extra allowed origins, comma separated (e.g. a Vercel preview domain). */
  CORS_EXTRA_ORIGINS: optionalString,

  COOKIE_DOMAIN: optionalString,
  /** Set true when client and API are on different sites (Vercel + Render). */
  CROSS_SITE_COOKIES: z
    .preprocess((v) => (v === undefined ? undefined : String(v) === 'true'), z.boolean().optional()),

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_SECURE: z.preprocess((v) => (v === undefined ? undefined : String(v) === 'true'), z.boolean().optional()),
  MAIL_FROM: z.string().default('Kinora <no-reply@kinora.local>'),

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,

  TMDB_API_KEY: optionalString,

  /** Set true only on an Atlas cluster with the `titles_search` index created. */
  ATLAS_SEARCH_ENABLED: z.preprocess((v) => String(v) === 'true', z.boolean().default(false)),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  /** Bootstrap admin, created by `npm run seed` when set. */
  SEED_ADMIN_EMAIL: optionalString,
  SEED_ADMIN_PASSWORD: optionalString,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // Fail loudly and readably; a stack trace here helps nobody.
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';

/**
 * Dev/test convenience: generate ephemeral JWT secrets when none are supplied.
 *
 * These are per-process, so restarting the server invalidates outstanding
 * tokens — annoying in a way that is *supposed* to nudge you into setting real
 * secrets in `.env`, and impossible to accidentally ship (see the production
 * guard below).
 */
const generatedAccessSecret = crypto.randomBytes(48).toString('hex');
const generatedRefreshSecret = crypto.randomBytes(48).toString('hex');

const usingGeneratedSecrets = !raw.JWT_ACCESS_SECRET || !raw.JWT_REFRESH_SECRET;

if (isProduction) {
  const missing: string[] = [];
  if (!raw.JWT_ACCESS_SECRET) missing.push('JWT_ACCESS_SECRET');
  if (!raw.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!process.env.CLIENT_URL) missing.push('CLIENT_URL');

  if (missing.length > 0) {
    console.error(
      `\nRefusing to start in production without: ${missing.join(', ')}.\n` +
        'Generate secrets with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n',
    );
    process.exit(1);
  }

  if (raw.JWT_ACCESS_SECRET === raw.JWT_REFRESH_SECRET) {
    console.error('\nJWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.\n');
    process.exit(1);
  }
}

const smtpConfigured = Boolean(raw.SMTP_HOST && raw.SMTP_USER && raw.SMTP_PASS);
const googleConfigured = Boolean(raw.GOOGLE_CLIENT_ID && raw.GOOGLE_CLIENT_SECRET);
const githubConfigured = Boolean(raw.GITHUB_CLIENT_ID && raw.GITHUB_CLIENT_SECRET);
const cloudinaryConfigured = Boolean(
  raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET,
);

export const env = {
  ...raw,
  MONGODB_URI: isTest ? raw.MONGODB_URI_TEST : raw.MONGODB_URI,
  JWT_ACCESS_SECRET: raw.JWT_ACCESS_SECRET ?? generatedAccessSecret,
  JWT_REFRESH_SECRET: raw.JWT_REFRESH_SECRET ?? generatedRefreshSecret,
  isProduction,
  isDevelopment: raw.NODE_ENV === 'development',
  isTest,
  usingGeneratedSecrets,
} as const;

/**
 * What this deployment can actually do. Routes and UI both read these so a
 * missing credential degrades to "button hidden", never "500 on click".
 */
export const features = {
  email: smtpConfigured,
  googleOAuth: googleConfigured,
  githubOAuth: githubConfigured,
  anyOAuth: googleConfigured || githubConfigured,
  cloudinary: cloudinaryConfigured,
  tmdbIngest: Boolean(raw.TMDB_API_KEY),
  atlasSearch: raw.ATLAS_SEARCH_ENABLED,
} as const;

/**
 * When mail is not configured we cannot email a verification link, so in
 * non-production we return it in the API response instead. Gated on both the
 * environment and the missing transport so it can never surface in production.
 */
export const exposeDevTokens = !isProduction && !smtpConfigured;

export const allowedOrigins: string[] = Array.from(
  new Set(
    [raw.CLIENT_URL, ...(raw.CORS_EXTRA_ORIGINS?.split(',') ?? [])]
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
  ),
);

export type Env = typeof env;
export type Features = typeof features;
