-- Migration: remove unique constraint on email to allow multiple users to share an email address.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS "UQ_97672ac88f789774dd47f7c8be3";
