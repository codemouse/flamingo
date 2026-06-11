#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Regenerates `web/src/api/generated/schema.d.ts` from the live OpenAPI spec.
 *
 *   1. Runs `npm run openapi:dump` in ../api to dump JSON to a temp file.
 *   2. Pipes that JSON into openapi-typescript to produce `schema.d.ts`.
 *   3. Cleans up the temp JSON.
 *
 * Run with: `npm run generate:api-types` from the web/ workspace.
 */
const { execSync } = require('node:child_process');
const { mkdirSync, rmSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const apiDir = path.resolve(root, '..', 'api');
const tmpJson = path.resolve(root, '.openapi.tmp.json');
const outFile = path.resolve(root, 'src', 'api', 'generated', 'schema.d.ts');

mkdirSync(path.dirname(outFile), { recursive: true });

try {
  console.log('▸ Dumping OpenAPI from API…');
  execSync(`npm run openapi:dump -- "${tmpJson}"`, {
    cwd: apiDir,
    stdio: 'inherit',
  });

  console.log('▸ Generating TypeScript types…');
  execSync(`npx openapi-typescript "${tmpJson}" -o "${outFile}"`, {
    cwd: root,
    stdio: 'inherit',
  });

  console.log(`✓ Wrote ${path.relative(root, outFile)}`);
} finally {
  if (existsSync(tmpJson)) rmSync(tmpJson);
}
