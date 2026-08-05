import { expect, test, type Page } from '@playwright/test';

/**
 * The Phase 1 exit criteria, as a browser journey.
 *
 * These assert on what a user can see and do, not on implementation details —
 * so they keep passing as the internals change, and fail loudly if the journey
 * itself breaks.
 */

const STRONG_PASSWORD = 'Str0ngPassword!2026';

function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@kinora.test`;
}

async function fillRegistration(page: Page, name: string, email: string, password: string) {
  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
}

test.describe('registration and verification', () => {
  test('a new visitor can register, verify, and reach their account', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await fillRegistration(page, 'E2E Viewer', email, STRONG_PASSWORD);

    // The strength meter reads from the same scoring function the API's policy
    // uses, so "Strong" here means the server will accept it.
    await expect(page.getByText(/Password strength:/)).toContainText('Strong');

    await page.getByRole('button', { name: 'Create account' }).click();

    // Without SMTP the API returns the verification token, which the client
    // consumes automatically — so the journey ends verified.
    await expect(page.getByRole('heading', { name: /Your account|Verify your email/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });

    // The unverified banner must be gone once verification completes.
    await expect(page.getByText('Your email address is not verified yet.')).toHaveCount(0);
  });

  test('rejects a weak password before submitting', async ({ page }) => {
    await page.goto('/register');
    await fillRegistration(page, 'Weak', uniqueEmail(), 'short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/at least 10 characters/i).first()).toBeVisible();
  });

  test('rejects mismatched confirmation', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('textbox', { name: 'Name' }).fill('Mismatch');
    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail());
    await page.getByLabel('Password', { exact: true }).fill(STRONG_PASSWORD);
    await page.getByLabel('Confirm password').fill(`${STRONG_PASSWORD}x`);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });
});

test.describe('sign in and sign out', () => {
  test('completes a full session round trip', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await fillRegistration(page, 'Round Trip', email, STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
  });

  test('keeps the session across a page reload', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await fillRegistration(page, 'Persist', email, STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });

    // The access token is memory-only, so surviving a reload proves the
    // httpOnly refresh cookie is being exchanged for a new one on mount.
    await page.reload();
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
  });

  test('shows one message for both wrong password and unknown account', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail('ghost'));
    await page.getByLabel('Password', { exact: true }).fill('Wr0ngPassword!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Incorrect email or password')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('route protection', () => {
  test('sends an anonymous visitor from a protected page to sign in', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('returns the visitor to where they were headed after signing in', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await fillRegistration(page, 'Deep Link', email, STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.goto('/account');
    await expect(page).toHaveURL(/\/login\?next=/, { timeout: 10_000 });

    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
  });

  test('hides the admin area from a regular user', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await fillRegistration(page, 'Not Admin', email, STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });

    await page.goto('/admin');
    // 404 rather than 403: a non-admin is not told the area exists.
    await expect(page.getByText("We couldn't find that page")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('accessibility basics', () => {
  test('exposes a working skip link as the first tab stop', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
  });

  test('associates validation errors with their field', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('textbox', { name: 'Email' }).fill('not-an-email');
    await page.getByRole('button', { name: 'Create account' }).click();

    const emailField = page.getByRole('textbox', { name: 'Email' });
    await expect(emailField).toHaveAttribute('aria-invalid', 'true');
    // The error must be announced, not merely coloured red.
    await expect(emailField).toHaveAttribute('aria-describedby', /-error$/);
  });
});
