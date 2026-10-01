import type { CookieOptions, Response } from 'express';
import { COOKIE_NAMES, TOKEN_TTL } from '@shared';
import { env } from '../config/env';

/**
 * Cookie policy for the refresh token and active-profile grant.
 *
 * `httpOnly` is the point of using a cookie at all: script-readable storage
 * means any XSS is an account takeover. The access token, by contrast, is
 * deliberately kept in JavaScript memory only — it is short-lived, and holding
 * it outside storage means a stolen page context loses it on reload.
 *
 * `sameSite` is the deployment-shaped part. Same-origin dev uses `lax`, which
 * blocks CSRF. Split deployment (Vercel client + Render API) is cross-site, so
 * the cookie needs `sameSite: 'none'` to be sent at all — which requires
 * `secure`, and gives up SameSite's CSRF protection. The strict CORS allow-list
 * plus the fact that refresh is the only cookie-authenticated endpoint is what
 * covers that gap.
 */
function baseOptions(maxAgeSeconds: number): CookieOptions {
  const crossSite = env.CROSS_SITE_COOKIES ?? false;

  return {
    httpOnly: true,
    secure: env.isProduction || crossSite,
    sameSite: crossSite ? 'none' : 'lax',
    maxAge: maxAgeSeconds * 1000,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAMES.refreshToken, token, baseOptions(TOKEN_TTL.refreshSeconds));
}

export function clearRefreshCookie(res: Response): void {
  // Same attributes as when it was set — a mismatched path or domain leaves the
  // original cookie in place and logout silently fails.
  const { maxAge: _maxAge, ...options } = baseOptions(0);
  res.clearCookie(COOKIE_NAMES.refreshToken, options);
}

export function setProfileCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAMES.activeProfile, token, baseOptions(TOKEN_TTL.refreshSeconds));
}

export function clearProfileCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = baseOptions(0);
  res.clearCookie(COOKIE_NAMES.activeProfile, options);
}
