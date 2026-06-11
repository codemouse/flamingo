#!/usr/bin/env node
/**
 * Verifies the SQL migration files in api/schema/ produce a database whose
 * shape matches the TypeORM entity definitions. Run as a CI guard after
 * `db:migrate` to catch drift between the SQL source-of-truth and the entity
 * decorators.
 *
 *   npm run db:check-drift  →  exits 0 when in sync, 1 when DDL would change.
 *
 * Internally creates a TypeORM DataSource against the test database, asks
 * `driver.createSchemaBuilder().log()` what migrations TypeORM *would* run
 * to sync the entities to the live schema, and prints + fails on any output.
 */
const path = require('node:path');
const fs = require('node:fs');

const envPath = path.resolve(__dirname, '..', '.env.test');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

require('reflect-metadata');
const { DataSource } = require('typeorm');

async function main() {
  const distEntities = path.resolve(__dirname, '..', 'dist', '**', '*.entity.js');
  if (!fs.existsSync(path.resolve(__dirname, '..', 'dist'))) {
    console.error('❌ dist/ is missing — run `npm run build` first.');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'flamingo_test',
    entities: [distEntities],
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  const sqlInMemory = await ds.driver.createSchemaBuilder().log();
  await ds.destroy();

  const pending = [...sqlInMemory.upQueries];
  if (pending.length === 0) {
    console.log('✓ Schema in sync with entities — no drift detected.');
    process.exit(0);
  }

  console.error(`❌ Detected ${pending.length} drift query/queries:\n`);
  for (const q of pending) console.error('  • ' + q.query);
  console.error(
    '\nFix: either update api/schema/ to match the entity, or revert the entity change.',
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
