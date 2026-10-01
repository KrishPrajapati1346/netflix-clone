import { Router } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@shared';
import { features } from '../config/env';
import { passport } from '../config/passport';
import * as controller from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import {
  authLimiter,
  emailDispatchLimiter,
  perAccountAuthLimiter,
} from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/providers', controller.providers);

router.post(
  '/register',
  authLimiter,
  perAccountAuthLimiter,
  validate({ body: registerSchema }),
  controller.register,
);

router.post(
  '/login',
  authLimiter,
  perAccountAuthLimiter,
  validate({ body: loginSchema }),
  controller.login,
);

// No `requireAuth`: the whole point of refresh is that the access token is
// already expired. The refresh cookie is the credential.
router.post('/refresh', authLimiter, controller.refresh);

router.post('/logout', controller.logout);
router.post('/logout-all', requireAuth, controller.logoutAll);

router.get('/me', requireAuth, controller.me);
router.get('/sessions', requireAuth, controller.sessions);

router.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), controller.verifyEmail);

router.post(
  '/resend-verification',
  emailDispatchLimiter,
  validate({ body: resendVerificationSchema }),
  controller.resendVerification,
);

router.post(
  '/forgot-password',
  emailDispatchLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword,
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  controller.resetPassword,
);

router.post(
  '/change-password',
  requireAuth,
  authLimiter,
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);

/**
 * OAuth routes are mounted only when the provider is configured, so an
 * unconfigured provider 404s instead of throwing a strategy-not-registered
 * error from deep inside Passport.
 */
if (features.googleOAuth) {
  router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/v1/auth/oauth-failure' }),
    controller.oauthCallback,
  );
}

if (features.githubOAuth) {
  router.get('/github', passport.authenticate('github', { session: false, scope: ['user:email'] }));
  router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/api/v1/auth/oauth-failure' }),
    controller.oauthCallback,
  );
}

router.get('/oauth-failure', controller.oauthFailure);

export const authRoutes = router;
