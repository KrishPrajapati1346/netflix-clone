import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { COOKIE_NAMES, type UserRole } from '@shared';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { verifyAccessToken, verifyProfileToken } from '../services/token.service';
import { ApiError } from '../utils/ApiError';

/** Header carrying the signed profile grant returned by profile selection. */
export const PROFILE_HEADER = 'x-kinora-profile';

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Rejects the request unless it carries a valid access token for a live user.
 *
 * The database lookup on every request is deliberate. A JWT is a snapshot: it
 * cannot know that the account was deleted, demoted, or had its password
 * changed thirty seconds ago. `credentialsChangedAt` turns those events into
 * immediate invalidation instead of waiting out the 15-minute token lifetime.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearer(req);
    if (!token) throw ApiError.unauthorized('Sign in to continue', 'NO_TOKEN');

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+passwordHash');

    if (!user) throw ApiError.unauthorized('Account no longer exists', 'USER_GONE');

    if (payload.iat * 1000 < user.credentialsChangedAt.getTime()) {
      throw ApiError.unauthorized(
        'Your password changed. Please sign in again.',
        'CREDENTIALS_CHANGED',
      );
    }

    // Role is re-read from the record rather than trusted from the token, so a
    // demotion takes effect on the next request instead of the next login.
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Attaches `req.user` when a valid token is present, and does nothing when it
 * is not. Used by browse endpoints that personalise for signed-in viewers but
 * must still answer anonymous requests.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearer(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && payload.iat * 1000 >= user.credentialsChangedAt.getTime()) {
      req.user = user;
    }
  } catch {
    // An expired or bogus token on an optional route degrades to anonymous
    // rather than failing the request.
  }
  next();
};

/** Role gate. Must be mounted after `requireAuth`. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized('Sign in to continue', 'NO_TOKEN'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('This area is restricted to administrators', 'ROLE_REQUIRED'));
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');

/** Gate for actions that should not happen before the address is confirmed. */
export const requireVerifiedEmail: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Sign in to continue', 'NO_TOKEN'));
  if (!req.user.isEmailVerified) {
    return next(
      ApiError.forbidden('Verify your email address to use this feature', 'EMAIL_NOT_VERIFIED'),
    );
  }
  next();
};

/**
 * Resolves the acting profile from a signed profile grant, and checks that the
 * profile still belongs to the authenticated user.
 *
 * Two independent checks, because each catches something the other misses:
 *
 *  - The grant's signature proves the profile was actually *selected* (its PIN,
 *    if any, was satisfied). A bare profile id in a header would be forgeable,
 *    which would reduce a PIN lock to a suggestion.
 *  - The `userId` filter on the lookup proves the profile is still this user's.
 *    Authentication answers "who are you"; this answers "is this yours".
 */
export function resolveProfile(options: { required: boolean }): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        if (options.required) throw ApiError.unauthorized('Sign in to continue', 'NO_TOKEN');
        return next();
      }

      const grant =
        req.header(PROFILE_HEADER) ??
        (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAMES.activeProfile];

      const bail = (error: ApiError) => (options.required ? next(error) : next());

      if (!grant) {
        return bail(ApiError.badRequest('Choose a profile to continue', 'PROFILE_REQUIRED'));
      }

      const profileId = verifyProfileToken(grant, req.user._id.toString());

      if (!profileId || !isValidObjectId(profileId)) {
        return bail(
          ApiError.forbidden('Profile session expired — choose a profile again', 'PROFILE_GRANT_INVALID'),
        );
      }

      const profile = await Profile.findOne({ _id: profileId, userId: req.user._id });

      if (!profile) {
        return bail(ApiError.forbidden('That profile is not available', 'PROFILE_NOT_FOUND'));
      }

      req.profile = profile;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireProfile = resolveProfile({ required: true });
export const optionalProfile = resolveProfile({ required: false });
