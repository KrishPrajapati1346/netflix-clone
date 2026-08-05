import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { api, app, bearer, registerAdmin, registerUser } from './helpers';
import { User } from '../src/models/User';

/**
 * Role-based access control.
 *
 * `/admin/overview` is the probe: it needs nothing but a role to answer, so a
 * failure here is unambiguously an authorization failure rather than a data
 * problem.
 */
describe('admin routes', () => {
  it('rejects an anonymous request', async () => {
    const response = await request(app).get(api('/admin/overview')).expect(401);
    expect(response.body.error.code).toBe('NO_TOKEN');
  });

  it('rejects an authenticated non-admin', async () => {
    const user = await registerUser();

    const response = await request(app)
      .get(api('/admin/overview'))
      .set(...bearer(user.accessToken))
      .expect(403);

    // Authenticated but not authorized — the distinction the code must make.
    expect(response.body.error.code).toBe('ROLE_REQUIRED');
  });

  it('allows an admin', async () => {
    const admin = await registerAdmin();

    const response = await request(app)
      .get(api('/admin/overview'))
      .set(...bearer(admin.accessToken))
      .expect(200);

    expect(response.body.data.users.total).toBeGreaterThan(0);
    expect(response.body.data.catalog).toHaveProperty('movies');
  });

  it('revokes access the moment the role is downgraded', async () => {
    const admin = await registerAdmin();

    await request(app)
      .get(api('/admin/overview'))
      .set(...bearer(admin.accessToken))
      .expect(200);

    await User.updateOne({ _id: admin.userId }, { $set: { role: 'user' } });

    // The access token still says "admin" and has not expired. Authorization
    // reads the role from the database on every request precisely so a
    // demotion takes effect immediately instead of at the next login.
    await request(app)
      .get(api('/admin/overview'))
      .set(...bearer(admin.accessToken))
      .expect(403);
  });

  it('does not let a user promote themselves through the profile payload', async () => {
    const user = await registerUser();

    // Mass-assignment probe: the register endpoint must ignore an unexpected
    // `role` field rather than trusting client-supplied input.
    const escalation = await request(app)
      .post(api('/auth/register'))
      .send({
        name: 'Sneaky',
        email: `escalate.${Date.now()}@kinora.test`,
        password: 'Str0ngPassword!',
        confirmPassword: 'Str0ngPassword!',
        role: 'admin',
      })
      .expect(201);

    expect(escalation.body.data.user.role).toBe('user');

    await request(app)
      .get(api('/admin/overview'))
      .set(...bearer(escalation.body.data.accessToken))
      .expect(403);

    expect(user.accessToken).toBeTruthy();
  });
});
