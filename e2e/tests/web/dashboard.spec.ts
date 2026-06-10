import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000';

const E2E_USER = 'e2e_web_user';
const E2E_PASS = 'e2ePassword1!';

const MOCK_ITEMS = [
  {
    id: 'item-uuid-1',
    userId: 'user-uuid-1',
    itemId: 'plaid-item-id-1',
    institutionId: 'ins_109508',
    institutionName: 'First Platypus Bank',
    cursor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_ACCOUNTS = [
  {
    account_id: 'acc-001',
    name: 'Plaid Checking',
    mask: '0000',
    type: 'depository',
    subtype: 'checking',
    official_name: 'Plaid Gold Standard 0% Interest Checking',
    balances: { available: 100, current: 110, iso_currency_code: 'USD', limit: null },
    itemId: 'plaid-item-id-1',
    institutionName: 'First Platypus Bank',
  },
];

const MOCK_TRANSACTIONS = [
  {
    itemId: 'plaid-item-id-1',
    added: [
      {
        transaction_id: 'txn-001',
        amount: 4.5,
        date: '2026-05-01',
        merchant_name: 'Coffee Shop',
        name: 'Coffee Shop',
        pending: false,
        personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'FOOD_AND_DRINK_COFFEE' },
      },
    ],
    modified: [],
    removed: [],
    nextCursor: 'cursor-abc',
  },
];

test.describe('dashboard', () => {
  let authToken: string;
  let authUser: Record<string, unknown>;

  test.beforeAll(async ({ request }) => {
    await request.post(`${API_BASE}/auth/register`, {
      data: { username: E2E_USER, password: E2E_PASS },
    });
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { username: E2E_USER, password: E2E_PASS },
    });
    const body = (await res.json()) as { accessToken: string; user: Record<string, unknown> };
    authToken = body.accessToken;
    authUser = body.user;
  });

  test.beforeEach(async ({ page }) => {
    const token = authToken;
    const user = authUser;
    await page.addInitScript(
      ({ t, u }: { t: string; u: Record<string, unknown> }) => {
        localStorage.setItem('access_token', t);
        localStorage.setItem('user', JSON.stringify(u));
      },
      { t: token, u: user },
    );

    // Mock Plaid endpoints so the dashboard renders without a real linked account
    await page.route('**/plaid/me/items', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ITEMS),
      }),
    );
    await page.route('**/plaid/me/accounts', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ACCOUNTS),
      }),
    );
    await page.route('**/plaid/me/transactions**', (route) =>
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
    await expect(page.getByText('Plaid Checking').first()).toBeVisible();
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
    await page.unroute('**/plaid/me/accounts');
    // TanStack Query retries 3 times by default; use abort to fail fast
    await page.route('**/plaid/me/accounts', (route) => route.abort());
    await page.goto('/dashboard');
    await expect(page.locator('.alert-error')).toContainText(
      'Failed to load accounts',
      { timeout: 30_000 },
    );
  });
});
