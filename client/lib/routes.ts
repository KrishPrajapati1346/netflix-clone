/**
 * Route constants and post-authentication destination logic.
 */

export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  account: '/account',
  admin: '/admin',
} as const;

/** Where a fully signed-in, verified user belongs. Becomes `/browse` in Phase 2. */
export const POST_AUTH_ROUTE = routes.account;

/**
 * Resolves where a freshly authenticated user should land.
 *
 * Deriving this from the user rather than hardcoding a destination is what
 * removes a race that is otherwise very easy to hit: registering both sets the
 * session (which makes the "already signed in" guard on /register want to
 * redirect) and triggers the form's own navigation to email verification. Two
 * navigations fire in the same commit and the last one wins non-deterministically
 * — which is how verification ends up silently skipped.
 *
 * Because both callers ask this function, they agree by construction and it no
 * longer matters which one lands. It also improves the returning-user case: an
 * unverified account that signs in later is taken straight back to verification.
 */
export function postAuthRoute(user: { isEmailVerified: boolean } | null): string {
  if (user && !user.isEmailVerified) return routes.verifyEmail;
  return POST_AUTH_ROUTE;
}

/**
 * Carries the development-only verification token across that navigation.
 *
 * When SMTP is unconfigured the API returns the verification link in the
 * registration response so the flow stays completable on a fresh clone. Parking
 * it in sessionStorage rather than a query parameter means the token survives
 * whichever navigation wins, and keeps a credential-shaped value out of the
 * address bar and browser history.
 */
const DEV_VERIFY_TOKEN_KEY = 'kinora.devVerifyToken';

export function stashDevVerificationToken(token: string): void {
  try {
    window.sessionStorage.setItem(DEV_VERIFY_TOKEN_KEY, token);
  } catch {
    /* storage unavailable (Safari private mode) — the user can use the emailed link */
  }
}

/** Reads and clears the stashed token; single-use, like the token itself. */
export function takeDevVerificationToken(): string | null {
  try {
    const token = window.sessionStorage.getItem(DEV_VERIFY_TOKEN_KEY);
    if (token) window.sessionStorage.removeItem(DEV_VERIFY_TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
}
