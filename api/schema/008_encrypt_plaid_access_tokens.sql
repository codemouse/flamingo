-- Encrypts plaid_items.access_token at rest using application-layer AES-256-GCM.
-- This file is intentionally a no-op at the schema level: the column type is
-- already TEXT and ciphertext fits. Existing rows are migrated by running
--   npm run db:encrypt-tokens --workspace=api
-- which re-saves each row through the encryptedColumn TypeORM transformer.
SELECT 1;
