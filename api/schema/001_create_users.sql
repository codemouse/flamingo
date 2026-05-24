-- schema/001_create_users.sql
-- Creates the users table.
-- In development, TypeORM (synchronize: true) applies this automatically.
-- Run manually in staging/production via your migration tool of choice.
--
-- Note: TypeORM names PostgreSQL enum types as "<table>_<column>_enum".
-- The type below matches the name TypeORM generates for the role column.

CREATE TYPE "users_role_enum" AS ENUM ('user', 'admin');

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

-- Automatically refresh updated_at on row updates
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
