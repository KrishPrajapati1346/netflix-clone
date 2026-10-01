import type { Types } from 'mongoose';
import {
  TOKEN_TTL,
  type LoginInput,
  type RegisterInput,
  type UserDTO,
} from '@shared';
import { env, exposeDevTokens } from '../config/env';
import { logger } from '../config/logger';
import { LOCKOUT_MS, MAX_FAILED_LOGINS, User, type UserDocument } from '../models/User';
import { Profile } from '../models/Profile';
import { VerificationToken, type VerificationPurpose } from '../models/VerificationToken';
import { ApiError } from '../utils/ApiError';
import { generateSecret, hashSecret } from '../utils/crypto';
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email.service';
import { revokeAllForUser } from './token.service';

export interface RegisterResult {
  user: UserDocument;
  /** Present only when mail is unconfigured outside production. */
  devVerificationUrl?: string;
}

/**
 * Creates an account plus its first profile.
 *
 * The default profile exists so a freshly registered user lands on a usable
 * home page instead of an empty profile picker — and so every downstream
 * feature can assume "an account always has at least one profile".
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const existing = await User.findOne({ email: input.email }).select('+passwordHash');

  if (existing) {
    // An account exists. If it was created via OAuth and has no password, let
    // the user set one rather than dead-ending them at "email taken".
    if (!existing.passwordHash) {
      throw ApiError.conflict(
        'That email is already registered through a social login. Sign in with it, or use "forgot password" to set a password.',
        'OAUTH_ACCOUNT_EXISTS',
      );
    }
    throw ApiError.conflict('An account with that email already exists', 'EMAIL_TAKEN');
  }

  const user = new User({
    name: input.name,
    email: input.email,
    role: 'user',
    isEmailVerified: false,
  });
  await user.setPassword(input.password);
  await user.save();

  await Profile.create({
    userId: user._id,
    name: input.name.split(' ')[0]?.slice(0, 30) || input.name.slice(0, 30),
    avatarKey: 'ember',
  });

  const { url } = await issueVerificationLink(user, 'email_verification');
  await sendVerificationEmail(user.email, user.name, url);

  logger.info({ userId: user._id.toString() }, 'User registered');

  return exposeDevTokens ? { user, devVerificationUrl: url } : { user };
}

export interface LoginResult {
  user: UserDocument;
}

/**
 * Verifies credentials with uniform failure messaging.
 *
 * Every wrong-email and wrong-password path returns the same message and code,
 * so the endpoint cannot be used to enumerate which addresses have accounts.
 * Lockout is the one deliberate exception: telling a legitimate user *why* they
 * are blocked is worth more than the small amount it reveals.
 */
export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const invalid = ApiError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');

  const user = await User.findOne({ email: input.email }).select(
    '+passwordHash +failedLoginAttempts +lockedUntil',
  );

  if (!user) {
    // Spend comparable time to a real bcrypt compare so response latency does
    // not distinguish "no such user" from "wrong password".
    await burnTime();
    throw invalid;
  }

  if (user.isLocked()) {
    const minutes = Math.ceil(((user.lockedUntil?.getTime() ?? 0) - Date.now()) / 60000);
    throw new ApiError(
      429,
      'ACCOUNT_LOCKED',
      `Too many failed attempts. Try again in ${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}.`,
    );
  }

  if (!user.passwordHash) {
    await burnTime();
    throw ApiError.unauthorized(
      'That account uses a social login. Sign in with Google or GitHub, or reset your password to set one.',
      'NO_PASSWORD_SET',
    );
  }

  const ok = await user.verifyPassword(input.password);

  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
      user.failedLoginAttempts = 0;
      logger.warn({ userId: user._id.toString() }, 'Account locked after repeated failed logins');
    }
    await user.save();
    throw invalid;
  }

  if (user.failedLoginAttempts !== 0 || user.lockedUntil) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
  }
  user.lastLoginAt = new Date();
  await user.save();

  return { user };
}

export async function verifyEmail(token: string): Promise<UserDTO> {
  const record = await consumeVerificationToken(token, 'email_verification');
  const user = await User.findById(record.userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('Account not found', 'USER_GONE');

  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    await user.save();
    logger.info({ userId: user._id.toString() }, 'Email verified');
  }

  return user.toDTO();
}

export async function resendVerification(email: string): Promise<{ devVerificationUrl?: string }> {
  const user = await User.findOne({ email });

  // Always report success: whether an address is registered is not this
  // endpoint's information to give away.
  if (!user || user.isEmailVerified) return {};

  // Invalidate outstanding links so only the newest one works.
  await VerificationToken.updateMany(
    { userId: user._id, purpose: 'email_verification', usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  const { url } = await issueVerificationLink(user, 'email_verification');
  await sendVerificationEmail(user.email, user.name, url);

  return exposeDevTokens ? { devVerificationUrl: url } : {};
}

export async function requestPasswordReset(email: string): Promise<{ devResetUrl?: string }> {
  const user = await User.findOne({ email });
  if (!user) return {};

  await VerificationToken.updateMany(
    { userId: user._id, purpose: 'password_reset', usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  const { url } = await issueVerificationLink(user, 'password_reset');
  await sendPasswordResetEmail(user.email, user.name, url);

  return exposeDevTokens ? { devResetUrl: url } : {};
}

export async function resetPassword(token: string, password: string): Promise<UserDocument> {
  const record = await consumeVerificationToken(token, 'password_reset');
  const user = await User.findById(record.userId).select('+passwordHash +failedLoginAttempts +lockedUntil');
  if (!user) throw ApiError.notFound('Account not found', 'USER_GONE');

  await user.setPassword(password);
  // Completing a reset proves control of the mailbox, so it also verifies the
  // address and clears any lockout the failed attempts caused.
  user.isEmailVerified = true;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  // A reset is the canonical "my account may be compromised" action: every
  // existing session must die, including any the attacker holds.
  await revokeAllForUser(user._id, 'password_change');
  await sendPasswordChangedEmail(user.email, user.name);

  logger.info({ userId: user._id.toString() }, 'Password reset completed');
  return user;
}

export async function changePassword(
  userId: Types.ObjectId,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('Account not found', 'USER_GONE');

  if (!user.passwordHash) {
    throw ApiError.badRequest(
      'This account has no password yet. Use "forgot password" to set one.',
      'NO_PASSWORD_SET',
    );
  }

  if (!(await user.verifyPassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  await user.setPassword(nextPassword);
  await user.save();

  await revokeAllForUser(user._id, 'password_change');
  await sendPasswordChangedEmail(user.email, user.name);
}

/**
 * Finds or creates the account behind an OAuth identity.
 *
 * Linking by verified email is what makes "sign up with password, later sign in
 * with Google" work instead of silently creating a second account. The provider
 * asserts the email, which is why we also mark it verified.
 */
export async function findOrCreateOAuthUser(params: {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}): Promise<UserDocument> {
  const byProvider = await User.findOne({
    linkedAccounts: { $elemMatch: { provider: params.provider, providerId: params.providerId } },
  }).select('+passwordHash');

  if (byProvider) {
    byProvider.lastLoginAt = new Date();
    await byProvider.save();
    return byProvider;
  }

  const byEmail = await User.findOne({ email: params.email.toLowerCase() }).select('+passwordHash');

  if (byEmail) {
    byEmail.linkedAccounts.push({
      provider: params.provider,
      providerId: params.providerId,
      linkedAt: new Date(),
    });
    byEmail.isEmailVerified = true;
    byEmail.lastLoginAt = new Date();
    if (!byEmail.avatarUrl && params.avatarUrl) byEmail.avatarUrl = params.avatarUrl;
    await byEmail.save();
    logger.info(
      { userId: byEmail._id.toString(), provider: params.provider },
      'Linked OAuth provider to existing account',
    );
    return byEmail;
  }

  const user = await User.create({
    name: params.name,
    email: params.email.toLowerCase(),
    role: 'user',
    isEmailVerified: true,
    avatarUrl: params.avatarUrl ?? null,
    linkedAccounts: [
      { provider: params.provider, providerId: params.providerId, linkedAt: new Date() },
    ],
    lastLoginAt: new Date(),
  });

  await Profile.create({
    userId: user._id,
    name: params.name.split(' ')[0]?.slice(0, 30) || 'Me',
    avatarKey: 'ember',
    avatarUrl: params.avatarUrl ?? null,
  });

  logger.info({ userId: user._id.toString(), provider: params.provider }, 'Created account via OAuth');
  return user as UserDocument;
}

async function issueVerificationLink(
  user: UserDocument,
  purpose: VerificationPurpose,
): Promise<{ token: string; url: string }> {
  const { token, hash } = generateSecret(32);
  const ttl =
    purpose === 'email_verification'
      ? TOKEN_TTL.emailVerificationSeconds
      : TOKEN_TTL.passwordResetSeconds;

  await VerificationToken.create({
    userId: user._id,
    tokenHash: hash,
    purpose,
    expiresAt: new Date(Date.now() + ttl * 1000),
  });

  const path = purpose === 'email_verification' ? 'verify-email' : 'reset-password';
  const url = `${env.CLIENT_URL.replace(/\/$/, '')}/${path}?token=${token}`;
  return { token, url };
}

async function consumeVerificationToken(token: string, purpose: VerificationPurpose) {
  const record = await VerificationToken.findOne({ tokenHash: hashSecret(token), purpose });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest(
      'That link is invalid or has expired. Request a new one.',
      'TOKEN_INVALID_OR_EXPIRED',
    );
  }

  record.usedAt = new Date();
  await record.save();
  return record;
}

/**
 * Burns roughly one bcrypt's worth of time on paths that never reach a real
 * comparison, so timing does not leak account existence.
 */
async function burnTime(): Promise<void> {
  const bcrypt = await import('bcryptjs');
  await bcrypt.compare(
    'timing-equalizer',
    '$2b$12$C6UzMDM.H6dfI/f/IKcEeO3vQGFvXqQ5uZ6vQ0J0kZ0kZ0kZ0kZ0k',
  );
}
