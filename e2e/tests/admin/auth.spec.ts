import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

/** Non-admin user used to verify access-denied behaviour. */
const E2E_NON_ADMIN = 'e2e_nonadmin_user';
const E2E_NON_ADMIN_PASS = 'e2ePassword1!';

test.beforeAll(async ({ request }) => {
  // Ensure a regular (non-admin) test user exists; 409 = already registered.
  await request.post(`${API_BASE}/auth/register`, {
    data: { username: E2E_NON_ADMIN, password: E2E_NON_ADMIN_PASS },
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------
test.describe('login page', () => {
  test('renders heading, inputs, and sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Admin Sign In' })).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill('totally-wrong');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('.alert-error')).toContainText('Invalid username or password');
  });

  test('blocks non-admin users with an access-denied message', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(E2E_NON_ADMIN);
    await page.locator('input[type="password"]').fill(E2E_NON_ADMIN_PASS);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('.alert-error')).toContainText('Access denied');
  });

  test('redirects to /dashboard on valid admin credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill(ADMIN_PASS);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
test.describe('logout', () => {
  test('sign out returns to /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill(ADMIN_PASS);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/login/);
    // Auth cleared — /dashboard should redirect back to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
