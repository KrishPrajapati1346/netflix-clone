import { COOKIE_NAMES, type AuthSessionDTO } from '@shared';
import type { Request, Response } from 'express';
import { env, features } from '../config/env';
import { User } from '../models/User';
import * as authService from '../services/auth.service';
import * as tokenService from '../services/token.service';
import { ApiError } from '../utils/ApiError';
import { clearProfileCookie, clearRefreshCookie, setRefreshCookie } from '../utils/cookies';
import { asyncHandler, sendData } from '../utils/http';
import { body } from '../middleware/validate';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@shared';

function sessionContext(req: Request): tokenService.SessionContext {
  return { userAgent: req.headers['user-agent'] ?? null, ip: req.ip ?? null };
}

function readRefreshCookie(req: Request): string {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAMES.refreshToken];
  if (!token) throw ApiError.unauthorized('No active session', 'NO_REFRESH_TOKEN');
  return token;
}

/** Looks up the current role, so a rotated token reflects a demotion immediately. */
const roleLookup: Parameters<typeof tokenService.rotateRefreshToken>[1] = async (userId) => {
  const user = await User.findById(userId).select('role');
  return user?.role ?? null;
};

export const register = asyncHandler(async (req, res) => {
  const input = body<RegisterInput>(req);
  const { user, devVerificationUrl } = await authService.registerUser(input);

  const tokens = await tokenService.issueTokenPair(user._id, user.role, sessionContext(req));
  setRefreshCookie(res, tokens.refreshToken);

  const session: AuthSessionDTO & { devVerificationUrl?: string } = {
    user: user.toDTO(),
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
    // Only present when mail is unconfigured outside production, so the flow
    // stays completable on a fresh clone with an empty .env.
    ...(devVerificationUrl ? { devVerificationUrl } : {}),
  };

  sendData(res, session, 201);
});

export const login = asyncHandler(async (req, res) => {
  const input = body<LoginInput>(req);
  const { user } = await authService.loginUser(input);

  const tokens = await tokenService.issueTokenPair(user._id, user.role, sessionContext(req));
  setRefreshCookie(res, tokens.refreshToken);

  sendData(res, {
    user: user.toDTO(),
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  } satisfies AuthSessionDTO);
});

/**
 * Exchanges the refresh cookie for a new access token, rotating the refresh
 * token in the same step. The client calls this transparently from an Axios
 * interceptor when a request comes back `TOKEN_EXPIRED`.
 */
export const refresh = asyncHandler(async (req, res) => {
  const presented = readRefreshCookie(req);

  let tokens;
  try {
    tokens = await tokenService.rotateRefreshToken(presented, roleLookup, sessionContext(req));
  } catch (error) {
    // The cookie is now known-bad; clearing it stops the client from retrying
    // forever with a token that can never work again.
    clearRefreshCookie(res);
    throw error;
  }

  setRefreshCookie(res, tokens.refreshToken);

  const payload = tokenService.verifyAccessToken(tokens.accessToken);
  const user = await User.findById(payload.sub).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'USER_GONE');

  sendData(res, {
    user: user.toDTO(),
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  } satisfies AuthSessionDTO);
});

export const logout = asyncHandler(async (req, res) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAMES.refreshToken];
  if (token) await tokenService.revokeRefreshToken(token, 'logout');

  clearRefreshCookie(res);
  clearProfileCookie(res);
  sendData(res, { loggedOut: true });
});

export const logoutAll = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();

  const revoked = await tokenService.revokeAllForUser(req.user._id, 'logout_all');
  clearRefreshCookie(res);
  clearProfileCookie(res);

  sendData(res, { loggedOut: true, sessionsRevoked: revoked });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  sendData(res, { user: req.user.toDTO() });
});

export const sessions = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const active = await tokenService.listActiveSessions(req.user._id);
  sendData(res, { sessions: active });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = body<VerifyEmailInput>(req);
  const user = await authService.verifyEmail(token);
  sendData(res, { user });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = body<ResendVerificationInput>(req);
  const result = await authService.resendVerification(email);

  sendData(res, {
    // Deliberately unconditional: a different response for registered and
    // unregistered addresses would turn this into an account-enumeration oracle.
    message: 'If that address needs verifying, a new link is on its way.',
    ...result,
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = body<ForgotPasswordInput>(req);
  const result = await authService.requestPasswordReset(email);

  sendData(res, {
    message: 'If an account exists for that address, a reset link is on its way.',
    ...result,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = body<ResetPasswordInput>(req);
  const user = await authService.resetPassword(token, password);

  // Sign the user straight in — they just proved mailbox control, and bouncing
  // them to a login form to retype the password they just chose is friction
  // with no security benefit.
  const tokens = await tokenService.issueTokenPair(user._id, user.role, sessionContext(req));
  setRefreshCookie(res, tokens.refreshToken);

  sendData(res, {
    user: user.toDTO(),
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  } satisfies AuthSessionDTO);
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const input = body<ChangePasswordInput>(req);

  await authService.changePassword(req.user._id, input.currentPassword, input.password);

  // `changePassword` revoked every session including this one, so issue a fresh
  // pair rather than leaving the caller holding a dead token.
  const tokens = await tokenService.issueTokenPair(req.user._id, req.user.role, sessionContext(req));
  setRefreshCookie(res, tokens.refreshToken);

  sendData(res, {
    user: req.user.toDTO(),
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  } satisfies AuthSessionDTO);
});

/** Lets the client render only the social buttons this deployment can serve. */
export const providers = asyncHandler(async (_req, res) => {
  sendData(res, {
    google: features.googleOAuth,
    github: features.githubOAuth,
    emailDelivery: features.email,
  });
});

/**
 * Completes an OAuth handshake.
 *
 * Passport has authenticated the user by this point; the job here is to mint
 * Kinora's own tokens and hand control back to the client. The access token
 * travels in the redirect fragment rather than the query string, because
 * fragments are not sent to servers and do not land in access logs or Referer
 * headers. The client reads it, stores it in memory, and strips it from the URL.
 */
export const oauthCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw ApiError.unauthorized('OAuth sign-in failed', 'OAUTH_FAILED');

  const tokens = await tokenService.issueTokenPair(user._id, user.role, sessionContext(req));
  setRefreshCookie(res, tokens.refreshToken);

  const target = new URL('/auth/callback', env.CLIENT_URL);
  res.redirect(`${target.toString()}#token=${encodeURIComponent(tokens.accessToken)}`);
});

export const oauthFailure = (_req: Request, res: Response): void => {
  const target = new URL('/login', env.CLIENT_URL);
  target.searchParams.set('error', 'oauth_failed');
  res.redirect(target.toString());
};
