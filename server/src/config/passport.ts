import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env, features } from './env';
import { logger } from './logger';
import { findOrCreateOAuthUser } from '../services/auth.service';
import type { UserDocument } from '../models/User';

/**
 * OAuth strategies, registered only when their credentials exist.
 *
 * Registering a strategy with `undefined` secrets throws at boot, so a partially
 * configured `.env` would take the whole API down. Gating on `features` keeps
 * an unconfigured provider to a hidden button — `GET /auth/providers` tells the
 * client which ones are live.
 *
 * Sessions are disabled throughout: this API is stateless and hands out JWTs.
 * Passport is used purely as the provider-handshake layer, so there is no
 * session store to run and no `serializeUser` to maintain.
 */

export function configurePassport(): void {
  if (features.googleOAuth) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          callbackURL: `${env.SERVER_URL.replace(/\/$/, '')}/api/v1/auth/google/callback`,
          scope: ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile: GoogleProfile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('Google account did not provide an email address'));
            }

            const user = await findOrCreateOAuthUser({
              provider: 'google',
              providerId: profile.id,
              email,
              name: profile.displayName || email.split('@')[0] || 'Viewer',
              avatarUrl: profile.photos?.[0]?.value ?? null,
            });
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        },
      ),
    );
    logger.info('Google OAuth enabled');
  }

  if (features.githubOAuth) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID!,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
          callbackURL: `${env.SERVER_URL.replace(/\/$/, '')}/api/v1/auth/github/callback`,
          scope: ['user:email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: GitHubProfileLike,
          done: (error: Error | null, user?: UserDocument) => void,
        ) => {
          try {
            // GitHub only includes an email when the user made one public, so
            // fall back to the no-reply address it guarantees is unique.
            const email =
              profile.emails?.find((e) => Boolean(e.value))?.value ??
              `${profile.id}+${profile.username ?? 'user'}@users.noreply.github.com`;

            const user = await findOrCreateOAuthUser({
              provider: 'github',
              providerId: String(profile.id),
              email,
              name: profile.displayName || profile.username || 'Viewer',
              avatarUrl: profile.photos?.[0]?.value ?? null,
            });
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        },
      ),
    );
    logger.info('GitHub OAuth enabled');
  }

  if (!features.anyOAuth) {
    logger.info('No OAuth providers configured — social sign-in hidden in the UI');
  }
}

/** `passport-github2` ships loose types; this is the subset actually used. */
interface GitHubProfileLike {
  id: string | number;
  displayName?: string;
  username?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

export { passport };
