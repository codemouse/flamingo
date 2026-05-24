-- Migration: remove unique constraint on yodlee_login_name.
-- In sandbox mode multiple Flamingo users share the same pool of Yodlee
-- sandbox accounts, so 1:1 uniqueness cannot be enforced at the DB level.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS "UQ_056c372efb24d156d86b5a34295";
