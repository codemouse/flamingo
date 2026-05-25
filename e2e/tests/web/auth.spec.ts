import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000';

/** Stable test user created once and reused across all auth tests. */
const E2E_USER = 'e2e_web_user';
const E2E_PASS = 'e2ePassword1!';

test.beforeAll(async ({ request }) => {
  // Register once; 409 means it already exists — both are fine.
  await request.post(`${API_BASE}/auth/register`, {
    data: { username: E2E_USER, password: E2E_PASS },
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------
test.describe('login page', () => {
  test('renders heading, inputs, and sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(E2E_USER);
    await page.locator('input[type="password"]').fill('definitely-wrong');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('.alert-error')).toContainText('Invalid username or password');
  });

  test('redirects to /dashboard on valid credentials', async ({ page }) => {
    await page.route('**/yodlee/me/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.goto('/login');
    await page.locator('#username').fill(E2E_USER);
    await page.locator('input[type="password"]').fill(E2E_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Register page
// ---------------------------------------------------------------------------
test.describe('register page', () => {
  test('renders heading, all fields, and submit button', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('shows validation error when passwords do not match', async ({ page }) => {
    await page.goto('/register');
    await page.locator('#username').fill('e2e_nomatch');
    await page.locator('#password').fill('password123');
    await page.locator('#confirm').fill('different123');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('.alert-error')).toContainText('Passwords do not match');
  });

  test('shows validation error when password is too short', async ({ page }) => {
    await page.goto('/register');
    await page.locator('#username').fill('e2e_short');
    await page.locator('#password').fill('short1');
    await page.locator('#confirm').fill('short1');
    // Remove the HTML5 minlength constraint so the JS check in handleSubmit fires
    await page.locator('#password').evaluate((el) =>
      (el as HTMLInputElement).removeAttribute('minlength'),
    );
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('.alert-error')).toContainText('at least 8 characters');
  });

  test('registers a new user and redirects to /dashboard', async ({ page }) => {
    const username = `e2e_reg_${Date.now()}`;
    await page.route('**/yodlee/me/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.goto('/register');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill('e2ePassword1!');
    await page.locator('#confirm').fill('e2ePassword1!');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
test.describe('logout', () => {
  test('sign out clears auth and redirects to /login', async ({ page }) => {
    await page.route('**/yodlee/me/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.goto('/login');
    await page.locator('#username').fill(E2E_USER);
    await page.locator('input[type="password"]').fill(E2E_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    // localStorage cleared — returning to /dashboard should redirect back to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
