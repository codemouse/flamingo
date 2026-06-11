-- Persists Plaid transactions per Item so we don't have to call Plaid on
-- every dashboard load. Synced via webhooks (TRANSACTIONS_*) and a periodic
-- fallback job; see PlaidTransactionsService and PlaidSyncProcessor.
CREATE TABLE IF NOT EXISTS plaid_transactions (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id            UUID         NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  user_id                  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id           VARCHAR(255) NOT NULL,
  account_id               VARCHAR(255) NOT NULL,
  amount                   NUMERIC(20,4) NOT NULL,
  iso_currency_code        VARCHAR(8),
  unofficial_currency_code VARCHAR(16),
  date                     DATE         NOT NULL,
  authorized_date          DATE,
  name                     TEXT         NOT NULL,
  merchant_name            TEXT,
  payment_channel          VARCHAR(32),
  pending                  BOOLEAN      NOT NULL DEFAULT FALSE,
  category                 TEXT[],
  category_id              VARCHAR(64),
  raw                      JSONB        NOT NULL,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT plaid_transactions_transaction_id_key UNIQUE (transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_plaid_transactions_user_id ON plaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_item_id ON plaid_transactions(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_id ON plaid_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON plaid_transactions(date);
