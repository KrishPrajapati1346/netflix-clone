import request from 'supertest';
import type { Express } from 'express';
import { createApp, API_PREFIX } from '../src/app';
import { User } from '../src/models/User';

export const app: Express = createApp();
export const api = (path: string) => `${API_PREFIX}${path}`;

export const STRONG_PASSWORD = 'Str0ngPassword!';

let counter = 0;
/** Unique per call, so tests never collide on the unique email index. */
export function uniqueEmail(prefix = 'user'): string {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@kinora.test`;
}

export interface RegisteredUser {
  email: string;
  password: string;
  accessToken: string;
  refreshCookie: string;
  userId: string;
  verificationUrl?: string;
}

/** Registers an account and returns everything a test needs to act as it. */
export async function registerUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<RegisteredUser> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? STRONG_PASSWORD;

  const response = await request(app)
    .post(api('/auth/register'))
    .send({
      name: overrides.name ?? 'Test Viewer',
      email,
      password,
      confirmPassword: password,
    })
    .expect(201);

  return {
    email,
    password,
    accessToken: response.body.data.accessToken,
    refreshCookie: extractRefreshCookie(response),
    userId: response.body.data.user.id,
    verificationUrl: response.body.data.devVerificationUrl,
  };
}

/** Registers a user and promotes them to admin, for RBAC tests. */
export async function registerAdmin(): Promise<RegisteredUser> {
  const user = await registerUser({ name: 'Test Admin' });
  await User.updateOne({ _id: user.userId }, { $set: { role: 'admin', isEmailVerified: true } });

  // The role lives in the access token's claims *and* is re-read per request,
  // but re-logging in keeps the returned token honest about who this is.
  const login = await request(app)
    .post(api('/auth/login'))
    .send({ email: user.email, password: user.password })
    .expect(200);

  return {
    ...user,
    accessToken: login.body.data.accessToken,
    refreshCookie: extractRefreshCookie(login),
  };
}

export function extractRefreshCookie(response: request.Response): string {
  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies.find((cookie) => cookie.startsWith('kinora_rt='));
  return match?.split(';')[0] ?? '';
}

export function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}
