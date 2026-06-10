-- Plaid Items: one row per connected bank (Item) per user.
-- Replaces the yodlee_login_name pattern with a proper Items table.
-- Each Item holds an access_token (sensitive — encrypt at rest in production)
-- and a transactions sync cursor.

CREATE TABLE IF NOT EXISTS plaid_items (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id          VARCHAR(255) NOT NULL UNIQUE,
  access_token     TEXT         NOT NULL,
  institution_id   VARCHAR(100),
  institution_name VARCHAR(255),
  cursor           TEXT         DEFAULT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id  ON plaid_items(item_id);
