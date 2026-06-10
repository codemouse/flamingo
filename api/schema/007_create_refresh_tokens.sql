-- Refresh tokens: one row per active session.
-- Storing only the SHA-256 hash of the refresh token so DB compromise does not
-- leak usable tokens. On rotation we mark the old row revoked + replaced_by.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(64)  NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ  NOT NULL,
  revoked_at    TIMESTAMPTZ,
  replaced_by   UUID         REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  user_agent    VARCHAR(512),
  ip            VARCHAR(64),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
