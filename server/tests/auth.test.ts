import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Profile } from '../src/models/Profile';
import { RefreshToken } from '../src/models/RefreshToken';
import { User } from '../src/models/User';
import {
  api,
  app,
  bearer,
  extractRefreshCookie,
  registerUser,
  STRONG_PASSWORD,
  uniqueEmail,
} from './helpers';

describe('POST /auth/register', () => {
  it('creates an account, a default profile, and a session', async () => {
    const email = uniqueEmail();

    const response = await request(app)
      .post(api('/auth/register'))
      .send({ name: 'Ada Lovelace', email, password: STRONG_PASSWORD, confirmPassword: STRONG_PASSWORD })
      .expect(201);

    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.isEmailVerified).toBe(false);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(extractRefreshCookie(response)).toContain('kinora_rt=');

    // Every account gets a starting profile so no downstream feature has to
    // handle the "signed in with zero profiles" state.
    const user = await User.findOne({ email });
    expect(await Profile.countDocuments({ userId: user?._id })).toBe(1);
  });

  it('never serialises the password hash', async () => {
    const response = await request(app)
      .post(api('/auth/register'))
      .send({
        name: 'Grace Hopper',
        email: uniqueEmail(),
        password: STRONG_PASSWORD,
        confirmPassword: STRONG_PASSWORD,
      })
      .expect(201);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(STRONG_PASSWORD);
  });

  it('rejects a weak password with per-field detail', async () => {
    const response = await request(app)
      .post(api('/auth/register'))
      .send({ name: 'Al', email: uniqueEmail(), password: 'weak', confirmPassword: 'weak' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.password).toBeDefined();
  });

  it('rejects mismatched password confirmation', async () => {
    const response = await request(app)
      .post(api('/auth/register'))
      .send({
        name: 'Al',
        email: uniqueEmail(),
        password: STRONG_PASSWORD,
        confirmPassword: `${STRONG_PASSWORD}x`,
      })
      .expect(422);

    expect(response.body.error.details.confirmPassword).toBeDefined();
  });

  it('refuses a duplicate email', async () => {
    const { email } = await registerUser();

    const response = await request(app)
      .post(api('/auth/register'))
      .send({ name: 'Impostor', email, password: STRONG_PASSWORD, confirmPassword: STRONG_PASSWORD })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /auth/login', () => {
  it('signs in with correct credentials', async () => {
    const { email, password } = await registerUser();

    const response = await request(app)
      .post(api('/auth/login'))
      .send({ email, password })
      .expect(200);

    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const { email } = await registerUser();

    const wrongPassword = await request(app)
      .post(api('/auth/login'))
      .send({ email, password: 'Wr0ngPassword!' })
      .expect(401);

    const unknownAccount = await request(app)
      .post(api('/auth/login'))
      .send({ email: uniqueEmail('ghost'), password: 'Wr0ngPassword!' })
      .expect(401);

    // Identical responses are what stop this endpoint being used to discover
    // which addresses have accounts.
    expect(wrongPassword.body.error.message).toBe(unknownAccount.body.error.message);
    expect(wrongPassword.body.error.code).toBe(unknownAccount.body.error.code);
  });

  it('locks the account after repeated failures', async () => {
    const { email } = await registerUser();

    for (let attempt = 0; attempt < 8; attempt++) {
      await request(app).post(api('/auth/login')).send({ email, password: 'Wr0ngPassword!' });
    }

    const locked = await request(app)
      .post(api('/auth/login'))
      .send({ email, password: STRONG_PASSWORD })
      .expect(429);

    // Lockout must hold even against the *correct* password, or it is not a
    // lockout — it is a hint that the previous guesses were wrong.
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('is not fooled by a MongoDB operator object', async () => {
    await registerUser();

    const response = await request(app)
      .post(api('/auth/login'))
      .send({ email: { $gt: '' }, password: { $gt: '' } });

    expect(response.status).not.toBe(200);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /auth/me', () => {
  it('rejects an unauthenticated request', async () => {
    await request(app).get(api('/auth/me')).expect(401);
  });

  it('rejects a forged token', async () => {
    await request(app)
      .get(api('/auth/me'))
      .set(...bearer('not.a.real.token'))
      .expect(401);
  });

  it('returns the caller when the token is valid', async () => {
    const { accessToken, email } = await registerUser();

    const response = await request(app)
      .get(api('/auth/me'))
      .set(...bearer(accessToken))
      .expect(200);

    expect(response.body.data.user.email).toBe(email);
  });

  it('accepts a token issued in the same second as the password was set', async () => {
    // Regression guard: `credentialsChangedAt` is compared against the JWT's
    // `iat`, which is whole seconds. When it carried millisecond precision,
    // every freshly registered user was rejected on their first request.
    const { accessToken } = await registerUser();

    await request(app)
      .get(api('/auth/me'))
      .set(...bearer(accessToken))
      .expect(200);
  });
});

describe('email verification', () => {
  it('verifies with the emailed token, and only once', async () => {
    const { verificationUrl } = await registerUser();
    expect(verificationUrl).toBeTruthy();

    const token = verificationUrl!.split('token=')[1]!;

    const verified = await request(app)
      .post(api('/auth/verify-email'))
      .send({ token })
      .expect(200);
    expect(verified.body.data.user.isEmailVerified).toBe(true);

    // Replaying a consumed link must fail, or a leaked link is reusable forever.
    await request(app).post(api('/auth/verify-email')).send({ token }).expect(400);
  });

  it('rejects a token that was never issued', async () => {
    await request(app)
      .post(api('/auth/verify-email'))
      .send({ token: 'x'.repeat(40) })
      .expect(400);
  });
});

describe('password reset', () => {
  it('resets the password, signs the user in, and kills old sessions', async () => {
    const { email, refreshCookie } = await registerUser();

    const requested = await request(app)
      .post(api('/auth/forgot-password'))
      .send({ email })
      .expect(200);

    const token = requested.body.data.devResetUrl.split('token=')[1];
    const newPassword = 'Rot4tedPassword!';

    const reset = await request(app)
      .post(api('/auth/reset-password'))
      .send({ token, password: newPassword, confirmPassword: newPassword })
      .expect(200);
    expect(reset.body.data.accessToken).toBeTruthy();

    // The session that existed before the reset must be dead — that is the
    // whole point of resetting a possibly-compromised account.
    await request(app).post(api('/auth/refresh')).set('Cookie', refreshCookie).expect(401);

    await request(app).post(api('/auth/login')).send({ email, password: newPassword }).expect(200);
    await request(app).post(api('/auth/login')).send({ email, password: STRONG_PASSWORD }).expect(401);
  });

  it('does not reveal whether an address is registered', async () => {
    const known = await registerUser();

    const forKnown = await request(app)
      .post(api('/auth/forgot-password'))
      .send({ email: known.email })
      .expect(200);

    const forUnknown = await request(app)
      .post(api('/auth/forgot-password'))
      .send({ email: uniqueEmail('ghost') })
      .expect(200);

    expect(forKnown.body.data.message).toBe(forUnknown.body.data.message);
  });
});

describe('refresh token rotation', () => {
  it('rotates the token on every refresh', async () => {
    const { refreshCookie } = await registerUser();

    const refreshed = await request(app)
      .post(api('/auth/refresh'))
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(extractRefreshCookie(refreshed)).not.toBe(refreshCookie);
    expect(refreshed.body.data.accessToken).toBeTruthy();
  });

  it('revokes the entire family when a rotated token is replayed', async () => {
    const { refreshCookie, userId } = await registerUser();

    const refreshed = await request(app)
      .post(api('/auth/refresh'))
      .set('Cookie', refreshCookie)
      .expect(200);
    const current = extractRefreshCookie(refreshed);

    // Replaying the superseded token is the signal that it leaked.
    const replay = await request(app)
      .post(api('/auth/refresh'))
      .set('Cookie', refreshCookie)
      .expect(401);
    expect(replay.body.error.code).toBe('REFRESH_REUSED');

    // The legitimate holder is signed out too. That is intentional: we cannot
    // tell the victim from the attacker, so both must re-authenticate.
    await request(app).post(api('/auth/refresh')).set('Cookie', current).expect(401);

    const live = await RefreshToken.countDocuments({ userId, revokedAt: null });
    expect(live).toBe(0);
  });

  it('refuses a refresh token that was never issued', async () => {
    await request(app)
      .post(api('/auth/refresh'))
      .set('Cookie', 'kinora_rt=fabricated-token-value')
      .expect(401);
  });

  it('requires a cookie at all', async () => {
    const response = await request(app).post(api('/auth/refresh')).expect(401);
    expect(response.body.error.code).toBe('NO_REFRESH_TOKEN');
  });
});

describe('logout', () => {
  it('kills the presented session only', async () => {
    const { email, password } = await registerUser();

    const first = await request(app).post(api('/auth/login')).send({ email, password }).expect(200);
    const second = await request(app).post(api('/auth/login')).send({ email, password }).expect(200);

    const firstCookie = extractRefreshCookie(first);
    const secondCookie = extractRefreshCookie(second);

    await request(app).post(api('/auth/logout')).set('Cookie', firstCookie).expect(200);

    await request(app).post(api('/auth/refresh')).set('Cookie', firstCookie).expect(401);
    // Signing out of one device must not sign out the others.
    await request(app).post(api('/auth/refresh')).set('Cookie', secondCookie).expect(200);
  });

  it('kills every session on logout-all', async () => {
    const { email, password, accessToken } = await registerUser();

    const other = await request(app).post(api('/auth/login')).send({ email, password }).expect(200);
    const otherCookie = extractRefreshCookie(other);

    await request(app)
      .post(api('/auth/logout-all'))
      .set(...bearer(accessToken))
      .expect(200);

    await request(app).post(api('/auth/refresh')).set('Cookie', otherCookie).expect(401);
  });
});

describe('change password', () => {
  it('requires the current password and invalidates other sessions', async () => {
    const { email, password, accessToken } = await registerUser();

    const otherDevice = await request(app)
      .post(api('/auth/login'))
      .send({ email, password })
      .expect(200);
    const otherCookie = extractRefreshCookie(otherDevice);

    const wrongCurrent = await request(app)
      .post(api('/auth/change-password'))
      .set(...bearer(accessToken))
      .send({
        currentPassword: 'Wr0ngPassword!',
        password: 'An0therPassword!',
        confirmPassword: 'An0therPassword!',
      })
      .expect(401);
    expect(wrongCurrent.body.error.code).toBe('INVALID_CREDENTIALS');

    const changed = await request(app)
      .post(api('/auth/change-password'))
      .set(...bearer(accessToken))
      .send({
        currentPassword: password,
        password: 'An0therPassword!',
        confirmPassword: 'An0therPassword!',
      })
      .expect(200);

    // The caller is handed a working session; everyone else is signed out.
    expect(changed.body.data.accessToken).toBeTruthy();
    await request(app).post(api('/auth/refresh')).set('Cookie', otherCookie).expect(401);

    // The old access token is void even though it has not expired yet.
    await request(app)
      .get(api('/auth/me'))
      .set(...bearer(accessToken))
      .expect(401);
  });
});

describe('health and capability reporting', () => {
  it('reports database connectivity', async () => {
    const response = await request(app).get(api('/health')).expect(200);
    expect(response.body.data.database).toBe('connected');
  });

  it('advertises which optional integrations are live', async () => {
    const response = await request(app).get(api('/features')).expect(200);
    // Without credentials these are all false, and the client hides the
    // corresponding UI rather than offering a button that 500s.
    expect(response.body.data).toHaveProperty('googleOAuth');
    expect(response.body.data).toHaveProperty('atlasSearch');
  });

  it('404s an unknown route in the shared error envelope', async () => {
    const response = await request(app).get(api('/does-not-exist')).expect(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
