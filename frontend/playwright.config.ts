import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * `webServer` boots the real client and API, so these tests exercise the actual
 * stack — cookies, CORS, token rotation and all — rather than a mocked one.
 * That is the point of having them alongside the API integration tests: those
 * verify the server's contract, these verify that a browser can complete a
 * journey through it.
 *
 * Two deliberate choices:
 *
 *  - **Dedicated ports (3010/4010).** The suite never collides with a dev
 *    session already running on 3000/4000, so `npm run test:e2e` is safe to run
 *    at any time.
 *  - **The API runs with `NODE_ENV=test`.** That points it at the test database
 *    (so the suite cannot pollute development data) and lifts rate limiting.
 *    Without that, a suite which registers a dozen accounts in a minute trips
 *    the 20-per-15-minutes auth limiter and fails on 429s roughly halfway
 *    through — the limiter working correctly, but measuring the wrong thing.
 *
 * Requires a running MongoDB (see README).
 */
const CLIENT_PORT = 3010;
const API_PORT = 4010;
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? CLIENT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'npm run dev:server --prefix ..',
      url: `${API_URL}/api/v1/health`,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        CLIENT_URL,
        SERVER_URL: API_URL,
      },
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npx next dev -p ${CLIENT_PORT}`,
      url: CLIENT_URL,
      env: { NEXT_PUBLIC_API_URL: API_URL },
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
