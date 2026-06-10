/** Plaid account types as returned by the Flamingo API */

export interface PlaidBalances {
  available: number | null;
  current: number | null;
  limit: number | null;
  iso_currency_code: string | null;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: "depository" | "credit" | "investment" | "loan" | string;
  subtype: string | null;
  balances: PlaidBalances;
  /** Added by Flamingo API to identify the source Item */
  itemId: string;
  institutionName: string | null;
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
  payment_channel: "online" | "in store" | "other";
  personal_finance_category?: {
    primary: string;
    detailed: string;
  } | null;
}

/** Shape returned by GET /plaid/me/transactions (per-item wrapper) */
export interface PlaidTransactionSync {
  itemId: string;
  institutionName: string | null;
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string; account_id: string }[];
}

export interface PlaidItem {
  id: string;
  itemId: string;
  userId: string;
  institutionId: string | null;
  institutionName: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Auth (routing & account numbers) ────────────────────────────────────────

export interface AchNumber {
  account_id: string;
  account: string;
  routing: string;
  wire_routing: string | null;
}

export interface PlaidAuthResponse {
  itemId: string;
  institutionName: string | null;
  accounts: PlaidAccount[];
  numbers: {
    ach: AchNumber[];
    eft: unknown[];
    international: unknown[];
    bacs: unknown[];
  };
}

// ── Identity ────────────────────────────────────────────────────────────────

export interface IdentityOwner {
  names: string[];
  emails: { data: string; primary: boolean; type: string }[];
  phone_numbers: { data: string; primary: boolean; type: string }[];
  addresses: {
    data: {
      city: string | null;
      region: string | null;
      postal_code: string | null;
      country: string | null;
      street: string | null;
    };
    primary: boolean;
  }[];
}

export interface PlaidIdentityAccount extends PlaidAccount {
  owners: IdentityOwner[];
}

export interface PlaidIdentityResponse {
  itemId: string;
  institutionName: string | null;
  accounts: PlaidIdentityAccount[];
}

// ── Liabilities ─────────────────────────────────────────────────────────────

export interface CreditLiability {
  account_id: string;
  aprs: {
    apr_percentage: number;
    apr_type: string;
    balance_subject_to_apr: number | null;
    interest_charge_amount: number | null;
  }[];
  is_overdue: boolean | null;
  last_payment_amount: number | null;
  last_payment_date: string | null;
  last_statement_balance: number | null;
  last_statement_issue_date: string | null;
  minimum_payment_amount: number | null;
  next_payment_due_date: string | null;
}

export interface StudentLiability {
  account_id: string;
  account_number: string | null;
  expected_payoff_date: string | null;
  guarantor: string | null;
  interest_rate_percentage: number;
  is_overdue: boolean | null;
  last_payment_amount: number | null;
  last_payment_date: string | null;
  loan_name: string | null;
  next_payment_due_date: string | null;
  origination_date: string | null;
  origination_principal_amount: number | null;
  outstanding_interest_amount: number | null;
  payment_reference_number: string | null;
  ytd_interest_paid: number | null;
  ytd_principal_paid: number | null;
}

export interface MortgageLiability {
  account_id: string;
  account_number: string;
  current_late_fee: number | null;
  interest_rate: { percentage: number | null; type: string | null };
  last_payment_amount: number | null;
  last_payment_date: string | null;
  loan_term: string | null;
  loan_type_description: string | null;
  maturity_date: string | null;
  next_monthly_payment: number | null;
  next_payment_due_date: string | null;
  origination_date: string | null;
  origination_principal_amount: number | null;
  past_due_amount: number | null;
  ytd_interest_paid: number | null;
  ytd_principal_paid: number | null;
}

export interface PlaidLiabilitiesResponse {
  itemId: string;
  institutionName: string | null;
  accounts: PlaidAccount[];
  liabilities: {
    credit: CreditLiability[] | null;
    student: StudentLiability[] | null;
    mortgage: MortgageLiability[] | null;
  } | null;
}

// ── Investments ─────────────────────────────────────────────────────────────

export interface Holding {
  account_id: string;
  security_id: string;
  institution_value: number;
  institution_price: number;
  institution_price_as_of: string | null;
  cost_basis: number | null;
  quantity: number;
  iso_currency_code: string | null;
}

export interface Security {
  security_id: string;
  ticker_symbol: string | null;
  name: string | null;
  type: string | null;
  close_price: number | null;
  iso_currency_code: string | null;
}

export interface PlaidHoldingsResponse {
  itemId: string;
  institutionName: string | null;
  accounts: PlaidAccount[];
  holdings: Holding[];
  securities: Security[];
}

export interface InvestmentTransaction {
  investment_transaction_id: string;
  account_id: string;
  security_id: string | null;
  date: string;
  name: string;
  quantity: number;
  amount: number;
  price: number;
  fees: number | null;
  type: string;
  subtype: string;
  iso_currency_code: string | null;
}

export interface PlaidInvestmentTransactionsResponse {
  itemId: string;
  institutionName: string | null;
  accounts: PlaidAccount[];
  investmentTransactions: InvestmentTransaction[];
  securities: Security[];
  totalInvestmentTransactions: number;
}

// ── Institutions ────────────────────────────────────────────────────────────

export interface PlaidInstitution {
  institution_id: string;
  name: string;
  products: string[];
  country_codes: string[];
  url: string | null;
  primary_color: string | null;
  logo: string | null;
}

// ── Sandbox webhook codes ────────────────────────────────────────────────────

export type SandboxWebhookCode =
  | "DEFAULT_UPDATE"
  | "NEW_ACCOUNTS_AVAILABLE"
  | "SMS_MICRODEPOSITS_VERIFICATION"
  | "USER_PERMISSION_REVOKED"
  | "USER_ACCOUNT_REVOKED"
  | "PENDING_DISCONNECT"
  | "RECURRING_TRANSACTIONS_UPDATE"
  | "LOGIN_REPAIRED"
  | "SYNC_UPDATES_AVAILABLE"
  | "PRODUCT_READY"
  | "ERROR";
