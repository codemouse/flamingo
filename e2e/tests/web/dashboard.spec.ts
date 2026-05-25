import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000';

const E2E_USER = 'e2e_web_user';
const E2E_PASS = 'e2ePassword1!';

const MOCK_ACCOUNTS = [
  {
    id: 1,
    accountName: 'Test Checking',
    accountNumber: '****1234',
    balance: { amount: 1500.0, currency: 'USD' },
    container: 'bank',
    accountType: 'CHECKING',
    providerName: 'Test Bank',
    lastUpdated: new Date().toISOString(),
  },
];

const MOCK_TRANSACTIONS = [
  {
    id: 1,
    description: { original: 'Coffee Shop', simple: 'Coffee Shop' },
    amount: { amount: 4.5, currency: 'USD' },
    transactionDate: '2026-05-01',
    baseType: 'DEBIT',
    categoryType: 'EXPENSE',
    category: 'Food & Drink',
    accountId: 1,
  },
];

test.describe('dashboard', () => {
  let authToken: string;
  let authUser: Record<string, unknown>;

  test.beforeAll(async ({ request }) => {
    // Ensure the test user exists
    await request.post(`${API_BASE}/auth/register`, {
      data: { username: E2E_USER, password: E2E_PASS },
    });
    // Obtain a real JWT for use in localStorage seeding
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { username: E2E_USER, password: E2E_PASS },
    });
    const body = (await res.json()) as { accessToken: string; user: Record<string, unknown> };
    authToken = body.accessToken;
    authUser = body.user;
  });

  test.beforeEach(async ({ page }) => {
    // Seed auth into localStorage before React boots so the app considers
    // the user authenticated without going through the login UI each time.
    const token = authToken;
    const user = authUser;
    await page.addInitScript(
      ({ t, u }: { t: string; u: Record<string, unknown> }) => {
        localStorage.setItem('access_token', t);
        localStorage.setItem('user', JSON.stringify(u));
      },
      { t: token, u: user },
    );

    // The test user has no Yodlee account linked. Mock the Yodlee endpoints
    // so the dashboard renders the accounts grid instead of an error state.
    await page.route('**/yodlee/me/accounts', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ACCOUNTS),
      }),
    );
    await page.route('**/yodlee/me/transactions**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TRANSACTIONS),
      }),
    );
  });

  test('renders the header with the signed-in username', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.dashboard-user')).toContainText(E2E_USER);
  });

  test('renders the mocked account in the accounts grid', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Test Checking').first()).toBeVisible();
  });

  test('renders the transactions table with a mocked transaction', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Coffee Shop')).toBeVisible();
  });

  test('renders the net worth banner', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.net-worth-value')).toBeVisible();
  });

  test('shows error state when the accounts API fails', async ({ page }) => {
    await page.unroute('**/yodlee/me/accounts');
    // TanStack Query retries 3 times by default; use abort to fail fast
    await page.route('**/yodlee/me/accounts', (route) => route.abort());
    await page.goto('/dashboard');
    await expect(page.locator('.alert-error')).toContainText(
      'Failed to load accounts',
      { timeout: 30_000 },
    );
  });
});
