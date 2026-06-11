#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Boots the Nest AppModule (no HTTP listen), generates the Swagger document,
 * and writes it to the path given as the first CLI arg.
 *
 *   node scripts/dump-openapi.cjs <output-path>
 *
 * Requires `npm run build` to have produced ./dist first.
 */
const { writeFileSync, mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

async function main() {
  const outArg = process.argv[2];
  if (!outArg) {
    console.error('Usage: dump-openapi <output-path>');
    process.exit(1);
  }
  const outPath = resolve(outArg);

  const { NestFactory } = require('@nestjs/core');
  const {
    FastifyAdapter,
  } = require('@nestjs/platform-fastify');
  const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
  const { AppModule } = require('../dist/app.module');

  const app = await NestFactory.create(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 1_048_576 }),
    { logger: false },
  );

  const config = new DocumentBuilder()
    .setTitle('Flamingo API')
    .setDescription('Flamingo REST API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'admin-jwt',
    )
    .build();

  await app.init();
  const document = SwaggerModule.createDocument(app, config);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI written → ${outPath}`);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
