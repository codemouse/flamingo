#!/usr/bin/env node
/**
 * Applies every numbered SQL file in api/schema/ (and api/schema/data/) in order,
 * idempotently, against DB_NAME on the local Postgres instance.
 *
 * Reads connection settings from .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD,
 * DB_NAME) and falls back to the conventional defaults used in api/.env.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Load api/.env so DB_* values are available without an explicit shell export.
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const env = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  name: process.env.DB_NAME || 'flamingo',
};

const schemaDir = path.resolve(__dirname, '..', 'schema');
const dataDir = path.join(schemaDir, 'data');

const sqlFiles = fs
  .readdirSync(schemaDir)
  .filter((f) => /^[0-9]+_.+\.sql$/.test(f))
  .sort()
  .map((f) => path.join(schemaDir, f));

const dataFiles = fs.existsSync(dataDir)
  ? fs
      .readdirSync(dataDir)
      .filter((f) => /^[0-9]+_.+\.sql$/.test(f))
      .sort()
      .map((f) => path.join(dataDir, f))
  : [];

function run(file) {
  const rel = path.relative(path.resolve(__dirname, '..'), file);
  process.stdout.write(`  applying ${rel}\n`);
  execSync(`psql -h ${env.host} -p ${env.port} -U ${env.user} -d ${env.name} -v ON_ERROR_STOP=1 -f "${file}"`, {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, PGPASSWORD: env.password },
  });
}

console.log(`> applying ${sqlFiles.length} schema file(s) and ${dataFiles.length} seed file(s) to ${env.name}@${env.host}:${env.port}`);
[...sqlFiles, ...dataFiles].forEach(run);
console.log('> migration complete');
