-- Migration: add yodlee_login_name to users
-- Each Flamingo user maps 1-to-1 with a Yodlee loginName.
-- Pre-existing sandbox accounts can be linked manually; new registrations
-- automatically create a Yodlee user via the sandbox API.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS yodlee_login_name VARCHAR(255) UNIQUE;
