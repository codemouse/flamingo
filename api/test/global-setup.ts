/**
 * Jest globalSetup — runs once before all e2e tests.
 * Creates the flamingo_test database if it does not already exist.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

export default async function globalSetup() {
  const dbName = process.env.DB_NAME ?? 'flamingo_test';

  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'brian',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: 'postgres', // connect to default db to issue CREATE DATABASE
  });

  await client.connect();
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (!rowCount) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[test] Created database: ${dbName}`);
  }
  await client.end();
}
