/**
 * Jest globalSetup — runs once before all e2e tests.
 * Creates the flamingo_test database (if missing) and applies schema migrations.
 * Migrations are idempotent (IF NOT EXISTS / IF EXISTS guards).
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({
  path: path.resolve(__dirname, '../.env.test'),
  override: true,
});

export default async function globalSetup() {
  const dbName = process.env.DB_NAME ?? 'flamingo_test';
  const baseConn = {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'brian',
    password: process.env.DB_PASSWORD ?? 'postgres',
  };

  const adminClient = new Client({ ...baseConn, database: 'postgres' });
  await adminClient.connect();
  const { rowCount } = await adminClient.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (!rowCount) {
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[test] Created database: ${dbName}`);
  }
  await adminClient.end();

  // Apply schema migrations in order (idempotent).
  const schemaDir = path.resolve(__dirname, '../schema');
  const files = fs
    .readdirSync(schemaDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  const dbClient = new Client({ ...baseConn, database: dbName });
  await dbClient.connect();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(schemaDir, file), 'utf8');
    try {
      await dbClient.query(sql);
    } catch (err) {
      console.error(`[test] Failed applying migration ${file}:`, err);
      throw err;
    }
  }
  await dbClient.end();
}
