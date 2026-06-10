import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

test.describe('admin dashboard', () => {
  let authToken: string;
  let authUser: Record<string, unknown>;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { username: ADMIN_USER, password: ADMIN_PASS },
    });
    const body = (await res.json()) as { accessToken: string; user: Record<string, unknown> };
    authToken = body.accessToken;
    authUser = body.user;
  });

  test.beforeEach(async ({ page }) => {
    // Seed shared auth into localStorage before React boots.
    const token = authToken;
    const user = authUser;
    await page.addInitScript(
      ({ t, u }: { t: string; u: Record<string, unknown> }) => {
        localStorage.setItem('access_token', t);
        localStorage.setItem('user', JSON.stringify(u));
      },
      { t: token, u: user },
    );
  });

  test('renders the admin badge and username', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('.admin-badge')).toBeVisible();
    await expect(page.locator('.dashboard-user')).toContainText(ADMIN_USER);
  });

  test('renders the user-management stats cards', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Admin Users')).toBeVisible();
  });

  test('renders the users table with the expected column headers', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Joined' })).toBeVisible();
  });

  test('shows the admin user row in the table', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('row', { name: /^admin\b/ })).toBeVisible();
  });

  test('shows an edit button for each user row', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
  });

  test('renders the linked Plaid Items section', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Linked Plaid Items/i })).toBeVisible();
  });
});
