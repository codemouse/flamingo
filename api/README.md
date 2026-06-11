# Flamingo API

NestJS REST API for Flamingo. Handles auth, Plaid integration, user/admin endpoints, and PostgreSQL persistence via TypeORM.

> Canonical docs (env vars, full endpoint reference, architecture, CI) live in the [repo root README](../README.md). This file covers only what is specific to running and developing inside `api/`.

---

## Run locally

```bash
# from repo root — install all workspaces
npm install

# create dev DB (one-time) and apply migrations
createdb flamingo
npm run db:migrate --workspace=api

# start in watch mode
cd api && npm run start:dev
```

API listens on `http://localhost:3000`. Swagger UI: <http://localhost:3000/api/docs>.

`api/.env` is required — copy [`api/.env.example`](./.env.example) and fill in Plaid + JWT values.

---

## Scripts

| Script               | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run start:dev`  | Nest watch mode                                   |
| `npm run start`      | One-shot dev start                                |
| `npm run start:prod` | Run compiled `dist/main`                          |
| `npm run build`      | `nest build` — emits to `dist/`                   |
| `npm run lint`       | ESLint with `--fix`                               |
| `npm run format`     | Prettier on `src/` and `test/`                    |
| `npm run test`       | Jest unit tests                                   |
| `npm run test:watch` | Jest watch mode                                   |
| `npm run test:cov`   | Coverage report (thresholds enforced)             |
| `npm run test:e2e`   | Supertest e2e suite (requires `flamingo_test` DB) |
| `npm run db:migrate` | Apply `schema/*.sql` idempotently                 |

---

## Layout

```
src/
  app.module.ts
  main.ts
  admin/        # Admin-only user management
  auth/         # JWT auth, guards, decorators, refresh tokens
  common/       # Shared utilities (crypto, etc.)
  config/       # env validation
  plaid/        # Plaid Link, items, accounts, transactions, webhooks
  users/        # User entity & service
test/           # E2E specs (Supertest, real Postgres, Plaid mocked)
schema/         # Numbered SQL migrations + seed data
scripts/        # CLI helpers (migrate.cjs, encrypt-existing-tokens.cjs)
```

---

## Tests

- Unit specs sit next to the source they cover (`*.spec.ts`).
- E2E specs live in [test/](./test) and run against `flamingo_test`. Create it once with `createdb flamingo_test`.
- Plaid is always mocked in tests — never call the live API. See [`test/helpers/`](./test/helpers).

Run the full suite before opening a PR:

```bash
npm run test
npm run test:e2e
```
