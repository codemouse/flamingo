-- Remove the Yodlee-specific login name column now that Plaid Items
-- (plaid_items table) fully replace it.

ALTER TABLE users
  DROP COLUMN IF EXISTS yodlee_login_name;
