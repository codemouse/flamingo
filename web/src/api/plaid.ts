import client from "./client";
import type {
  PlaidAccount,
  PlaidTransactionSync,
  PlaidItem,
  PlaidAuthResponse,
  PlaidIdentityResponse,
  PlaidLiabilitiesResponse,
  PlaidHoldingsResponse,
  PlaidInvestmentTransactionsResponse,
  PlaidInstitution,
  SandboxWebhookCode,
} from "../types/plaid";

// ── Link token ──────────────────────────────────────────────────────────────

export const createLinkToken = () =>
  client
    .post<{ linkToken: string }>("/plaid/me/link-token")
    .then((r) => r.data.linkToken);

// ── Token exchange ──────────────────────────────────────────────────────────

export const exchangeToken = (publicToken: string) =>
  client
    .post<PlaidItem>("/plaid/me/exchange-token", { publicToken })
    .then((r) => r.data);

// ── Items ───────────────────────────────────────────────────────────────────

export const getMyItems = () =>
  client.get<PlaidItem[]>("/plaid/me/items").then((r) => r.data);

// ── Accounts ────────────────────────────────────────────────────────────────

export const getMyAccounts = () =>
  client.get<PlaidAccount[]>("/plaid/me/accounts").then((r) => r.data);

export const refreshBalances = () =>
  client.post<PlaidAccount[]>("/plaid/me/balance/refresh").then((r) => r.data);

// ── Transactions ─────────────────────────────────────────────────────────────

export const getMyTransactions = () =>
  client
    .get<PlaidTransactionSync[]>("/plaid/me/transactions")
    .then((r) => r.data);

// ── Auth — routing & account numbers ────────────────────────────────────────

export const getMyAuth = () =>
  client.get<PlaidAuthResponse[]>("/plaid/me/auth").then((r) => r.data);

// ── Identity — account holder info ──────────────────────────────────────────

export const getMyIdentity = () =>
  client.get<PlaidIdentityResponse[]>("/plaid/me/identity").then((r) => r.data);

// ── Liabilities ─────────────────────────────────────────────────────────────

export const getMyLiabilities = () =>
  client
    .get<PlaidLiabilitiesResponse[]>("/plaid/me/liabilities")
    .then((r) => r.data);

// ── Investments ─────────────────────────────────────────────────────────────

export const getMyHoldings = () =>
  client
    .get<PlaidHoldingsResponse[]>("/plaid/me/investments/holdings")
    .then((r) => r.data);

export const getMyInvestmentTransactions = (params?: {
  startDate?: string;
  endDate?: string;
}) =>
  client
    .get<
      PlaidInvestmentTransactionsResponse[]
    >("/plaid/me/investments/transactions", { params })
    .then((r) => r.data);

// ── Institutions ────────────────────────────────────────────────────────────

export const searchInstitutions = (query: string) =>
  client
    .get<
      PlaidInstitution[]
    >("/plaid/institutions/search", { params: { query } })
    .then((r) => r.data);

// ── Unlink ───────────────────────────────────────────────────────────────────

export const removeItem = (id: string) =>
  client.delete(`/plaid/me/items/${id}`);

// ── Sandbox ──────────────────────────────────────────────────────────────────

export const sandboxCreateItem = (institutionId?: string) =>
  client
    .post<PlaidItem>("/plaid/sandbox/create-item", { institutionId })
    .then((r) => r.data);

export const getSandboxAccounts = () =>
  client.get<PlaidAccount[]>("/plaid/sandbox/accounts").then((r) => r.data);

export const getSandboxTransactions = () =>
  client.get<PlaidAccount[]>("/plaid/sandbox/transactions").then((r) => r.data);

// ── Sandbox testing utilities ────────────────────────────────────────────────

export const sandboxResetLogin = (itemUuid: string) =>
  client
    .post<{
      resetLogin: boolean;
    }>(`/plaid/sandbox/items/${itemUuid}/reset-login`)
    .then((r) => r.data);

export const sandboxFireWebhook = (
  itemUuid: string,
  webhookCode: SandboxWebhookCode,
) =>
  client
    .post<{
      webhookFired: boolean;
    }>(`/plaid/sandbox/items/${itemUuid}/fire-webhook`, { webhookCode })
    .then((r) => r.data);

export const sandboxCreateTransactions = (
  itemUuid: string,
  transactions: Array<{
    amount: number;
    date_posted: string;
    date_transacted: string;
    description: string;
    iso_currency_code?: string;
  }>,
) =>
  client.post(`/plaid/sandbox/items/${itemUuid}/transactions`, {
    transactions,
  });
