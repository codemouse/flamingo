import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

const E2E_NON_ADMIN = 'e2e_nonadmin_user';
const E2E_NON_ADMIN_PASS = 'e2ePassword1!';

test.beforeAll(async ({ request }) => {
  await request.post(`${API_BASE}/auth/register`, {
    data: { username: E2E_NON_ADMIN, password: E2E_NON_ADMIN_PASS },
  });
});

test.describe('admin login', () => {
  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill('totally-wrong');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page.locator('.alert-error')).toContainText('Invalid username or password');
  });

  test('admin login redirects to /admin', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill(ADMIN_PASS);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('non-admin login redirects to /dashboard, not /admin', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(E2E_NON_ADMIN);
    await page.locator('input[type="password"]').fill(E2E_NON_ADMIN_PASS);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('non-admin cannot reach /admin (redirects to /dashboard)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(E2E_NON_ADMIN);
    await page.locator('input[type="password"]').fill(E2E_NON_ADMIN_PASS);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('unauthenticated /admin redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('admin logout', () => {
  test('sign out returns to /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill(ADMIN_PASS);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
