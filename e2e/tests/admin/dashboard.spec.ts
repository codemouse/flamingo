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
    // Seed admin auth into localStorage before React boots.
    const token = authToken;
    const user = authUser;
    await page.addInitScript(
      ({ t, u }: { t: string; u: Record<string, unknown> }) => {
        localStorage.setItem('admin_access_token', t);
        localStorage.setItem('admin_user', JSON.stringify(u));
      },
      { t: token, u: user },
    );
  });

  test('renders the header with the admin username', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.dashboard-user')).toContainText(ADMIN_USER);
  });

  test('renders all three stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Admin Users')).toBeVisible();
    await expect(page.getByText('Yodlee Linked')).toBeVisible();
  });

  test('renders the users table with the expected column headers', async ({ page }) => {
    await page.goto('/dashboard');
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Yodlee Account' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  });

  test('shows the admin user row in the table', async ({ page }) => {
    await page.goto('/dashboard');
    // Match only the row whose accessible name starts with "admin" (the username)
    // to avoid matching e2e_nonadmin_user which also contains the substring.
    await expect(page.getByRole('row', { name: /^admin\b/ })).toBeVisible();
  });

  test('shows an edit button for each user row', async ({ page }) => {
    await page.goto('/dashboard');
    // At least one Edit button must be present (one per user row)
    await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
  });
});
