#!/usr/bin/env node
/**
 * One-shot script: encrypt any plaintext plaid_items.access_token rows.
 * Idempotent — already-encrypted rows are skipped.
 *
 * Usage:  node scripts/encrypt-existing-tokens.cjs
 * Reads the same env vars as the API (DB_*, ENCRYPTION_KEY).
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const {
  encryptString,
  isEncrypted,
} = require(path.resolve(__dirname, '..', 'dist', 'common', 'crypto', 'encryption.js'));
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'flamingo',
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, access_token FROM plaid_items',
    );
    let updated = 0;
    for (const row of rows) {
      if (isEncrypted(row.access_token)) continue;
      const ct = encryptString(row.access_token);
      await client.query(
        'UPDATE plaid_items SET access_token = $1 WHERE id = $2',
        [ct, row.id],
      );
      updated++;
    }
    console.log(`Encrypted ${updated} of ${rows.length} plaid_items rows.`);
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
