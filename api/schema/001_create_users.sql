-- schema/001_create_users.sql
-- Creates the users table.
-- All statements are idempotent so this file can be re-applied safely.
--
-- Note: TypeORM names PostgreSQL enum types as "<table>_<column>_enum".
-- The type below matches the name TypeORM generates for the role column.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    CREATE TYPE "users_role_enum" AS ENUM ('user', 'admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(150)  NOT NULL UNIQUE,
  email         VARCHAR(255)  UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          "users_role_enum" NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);

-- Automatically refresh updated_at on row updates.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
