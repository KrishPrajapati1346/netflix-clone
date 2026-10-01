import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { TOKEN_TTL, type UserRole } from '@shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { RefreshToken } from '../models/RefreshToken';
import { ApiError } from '../utils/ApiError';
import { generateSecret, hashSecret, randomId } from '../utils/crypto';

const ISSUER = 'kinora';
const AUDIENCE = 'kinora-client';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  /** Issued-at floor: tokens older than the user's credential change are void. */
  iat: number;
  exp: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SessionContext {
  userAgent?: string | null;
  ip?: string | null;
}

export function signAccessToken(userId: string, role: UserRole): string {
  const options: SignOptions = {
    expiresIn: TOKEN_TTL.accessSeconds,
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: userId,
  };
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw ApiError.unauthorized('Malformed access token', 'TOKEN_MALFORMED');
    }
    return decoded as unknown as AccessTokenPayload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      // Distinct code so the client interceptor knows to refresh rather than
      // bounce the user to the login screen.
      throw ApiError.unauthorized('Access token expired', 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid access token', 'TOKEN_INVALID');
  }
}

const PROFILE_AUDIENCE = 'kinora-profile';

export interface ProfileTokenPayload {
  sub: string;
  pid: string;
  iat: number;
  exp: number;
}

/**
 * Signs proof that this user has unlocked this profile.
 *
 * A raw profile id in a header would be trivially forgeable — a signed-in user
 * could type any profile id, and a PIN lock would be decoration. Selecting a
 * profile (satisfying its PIN, if any) mints this token instead, and every
 * profile-scoped request presents it.
 */
export function signProfileToken(userId: string, profileId: string): string {
  return jwt.sign({ pid: profileId }, env.JWT_ACCESS_SECRET, {
    expiresIn: TOKEN_TTL.refreshSeconds,
    issuer: ISSUER,
    audience: PROFILE_AUDIENCE,
    subject: userId,
  });
}

/** Returns the profile id, or null when the grant is missing/forged/expired. */
export function verifyProfileToken(token: string, expectedUserId: string): string | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: PROFILE_AUDIENCE,
    });
    if (typeof decoded === 'string') return null;

    const payload = decoded as unknown as ProfileTokenPayload;
    // A grant minted for one account must never be usable by another.
    if (payload.sub !== expectedUserId) return null;
    return typeof payload.pid === 'string' ? payload.pid : null;
  } catch {
    return null;
  }
}

/**
 * Issues a fresh access + refresh pair, starting a new token family.
 * Called on login, registration and OAuth callback.
 */
export async function issueTokenPair(
  userId: Types.ObjectId,
  role: UserRole,
  context: SessionContext = {},
): Promise<IssuedTokens> {
  return mintPair(userId, role, randomId(), context);
}

/**
 * Exchanges a refresh token for a new pair.
 *
 * Three outcomes matter:
 *  - unknown hash            -> the token was never issued (or was reaped): reject.
 *  - known but already used  -> replay of a rotated token: revoke the whole
 *                               family, because either the client or an attacker
 *                               is holding a stale copy and we cannot tell which.
 *  - known and live          -> rotate: mark old as rotated, mint a successor.
 */
export async function rotateRefreshToken(
  presentedToken: string,
  lookupRole: (userId: Types.ObjectId) => Promise<UserRole | null>,
  context: SessionContext = {},
): Promise<IssuedTokens> {
  const tokenHash = hashSecret(presentedToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    throw ApiError.unauthorized('Session expired, please sign in again', 'REFRESH_INVALID');
  }

  if (existing.revokedAt) {
    logger.warn(
      { userId: existing.userId.toString(), familyId: existing.familyId, reason: existing.revokedReason },
      'Refresh token reuse detected — revoking token family',
    );
    await revokeFamily(existing.familyId, 'reuse_detected');
    throw ApiError.unauthorized(
      'Session was reused and has been revoked for your security. Please sign in again.',
      'REFRESH_REUSED',
    );
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    existing.revokedAt = new Date();
    existing.revokedReason = 'logout';
    await existing.save();
    throw ApiError.unauthorized('Session expired, please sign in again', 'REFRESH_EXPIRED');
  }

  const role = await lookupRole(existing.userId);
  if (!role) {
    await revokeFamily(existing.familyId, 'logout_all');
    throw ApiError.unauthorized('Account no longer exists', 'USER_GONE');
  }

  const next = await mintPair(existing.userId, role, existing.familyId, context);

  existing.revokedAt = new Date();
  existing.revokedReason = 'rotated';
  existing.rotatedTo = hashSecret(next.refreshToken);
  await existing.save();

  return next;
}

export async function revokeRefreshToken(
  presentedToken: string,
  reason: 'logout' | 'password_change' = 'logout',
): Promise<void> {
  const tokenHash = hashSecret(presentedToken);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

export async function revokeFamily(
  familyId: string,
  reason: 'logout' | 'logout_all' | 'reuse_detected' | 'password_change',
): Promise<void> {
  await RefreshToken.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

/** "Sign out everywhere" — also used after a password change. */
export async function revokeAllForUser(
  userId: Types.ObjectId,
  reason: 'logout_all' | 'password_change' = 'logout_all',
): Promise<number> {
  const result = await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
  return result.modifiedCount;
}

export async function listActiveSessions(userId: Types.ObjectId) {
  return RefreshToken.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('familyId userAgent ip createdAt updatedAt expiresAt')
    .sort({ updatedAt: -1 })
    .lean();
}

async function mintPair(
  userId: Types.ObjectId,
  role: UserRole,
  familyId: string,
  context: SessionContext,
): Promise<IssuedTokens> {
  const { token, hash } = generateSecret(40);

  await RefreshToken.create({
    userId,
    tokenHash: hash,
    familyId,
    expiresAt: new Date(Date.now() + TOKEN_TTL.refreshSeconds * 1000),
    userAgent: context.userAgent?.slice(0, 400) ?? null,
    ip: context.ip?.slice(0, 90) ?? null,
  });

  return {
    accessToken: signAccessToken(userId.toString(), role),
    refreshToken: token,
    expiresIn: TOKEN_TTL.accessSeconds,
  };
}
