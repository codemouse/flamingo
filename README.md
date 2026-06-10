# Flamingo

Personal finance dashboard powered by [Plaid](https://plaid.com/). Users connect bank accounts via Plaid Link and see their balances and transactions in one place. Admins manage users from `/admin` in the same web app.

---

## Workspaces

| Directory | Package | Port     | Purpose                                                    |
| --------- | ------- | -------- | ---------------------------------------------------------- |
| `api/`    | `api`   | **3000** | NestJS REST API + Swagger                                  |
| `web/`    | `web`   | **5173** | React dashboard — user (`/dashboard`) and admin (`/admin`) |
| `e2e/`    | `e2e`   | —        | Playwright end-to-end tests                                |

---

## Prerequisites

| Tool       | Min version |
| ---------- | ----------- |
| Node.js    | 22          |
| npm        | 10          |
| PostgreSQL | 16          |

---

## Quick start

```bash
# 1. Install all workspace dependencies from the repo root
npm install

# 2. Copy and fill in the API environment file
cp api/.env.example api/.env   # edit values — see Configuration below

# 3. Bring up backing services (Postgres + Redis)
docker compose up -d

# 4. Create the development database and apply migrations
createdb -h localhost -U postgres flamingo   # one-time
npm run db:migrate --workspace=api

# 5. Start the api + web concurrently
npm run dev
```

`npm run dev` runs `api` and `web` via [concurrently](https://github.com/open-cli-tools/concurrently) with colour-coded prefixes. The admin panel lives at <http://localhost:5173/admin> for users with the `admin` role.

---

## Running services individually

```bash
npm run api          # NestJS (watch mode)
npm run web          # Vite dev server for web/
npm run db:migrate --workspace=api   # apply api/schema/*.sql idempotently
```

Or from within each workspace:

```bash
cd api  && npm run start:dev
cd web  && npm run dev
```

---

## Configuration

### `api/.env`

Create this file before starting the API. All variables are required unless marked optional.

```dotenv
# ── Application ──────────────────────────────────────────────────────────────
NODE_ENV=development          # development | production
PORT=3000                     # HTTP port the API listens on

# ── PostgreSQL ───────────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=flamingo

# ── Plaid ────────────────────────────────────────────────────────────────────
PLAID_ENV=sandbox                    # sandbox | production (only — `development` removed by Plaid)
PLAID_CLIENT_ID=<your-client-id>
PLAID_SECRET=<your-secret>
PLAID_WEBHOOK_URL=                                  # optional — webhook URL Plaid POSTs Item events to
PLAID_PRODUCTS=transactions,auth,identity,liabilities,investments
                                                    # comma-separated; valid: transactions, auth, identity, assets,
                                                    # investments, liabilities, payment_initiation, employment, income
PLAID_COUNTRY_CODES=US                              # comma-separated; valid: US, CA, GB, IE, FR, ES, NL, DE, IT, PL, BE, EE, DK, NO, SE, LT, LV, PT
PLAID_LANGUAGE=en                                   # en, es, fr, nl, de, it, pl, da, no, sv, ro, et, lv, lt, pt
PLAID_SANDBOX_INSTITUTIONS=ins_109508,ins_3,ins_4   # institutions for sandbox-create-item rotation

# ── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET=change-me-use-a-long-random-string   # min 32 chars in production
JWT_EXPIRES_IN=7d
```

> **Never commit `.env` files.** They are git-ignored. Use environment-specific secrets managers (AWS Secrets Manager, GitHub Actions secrets, etc.) in CI/CD.

### Frontend env vars

`web/` talks to the API via a preconfigured Axios client. No `.env` file is needed for local development — it points to `http://localhost:3000` by default.

To override the API base URL create a `.env.local` in the relevant workspace:

```dotenv
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## Project structure

```
flamingo/
├── api/                        # NestJS backend
│   ├── src/
│   │   ├── admin/              # Admin-only user management
│   │   ├── auth/               # JWT auth, guards, decorators
│   │   ├── users/              # User entity & service
│   │   └── plaid/              # Plaid integration — Link, Items, accounts, transactions
│   ├── test/                   # E2E specs (Supertest)
│   ├── schema/                 # SQL migration files (001_, 002_, …)
│   │   └── data/               # Seed data SQL
│   ├── .env                    # Local env (git-ignored)
│   └── .env.test               # Test env (git-ignored)
│
├── web/                        # React app \u2014 user dashboard + /admin (Vite + TypeScript)
│   └── src/
│       ├── api/                # Axios wrappers (auth, plaid, admin)
│       ├── components/         # AccountsGrid, TransactionsTable, admin/UsersTable, \u2026
│       ├── contexts/           # AuthContext (shared)
│       └── pages/              # LoginPage, RegisterPage, DashboardPage, admin/AdminDashboardPage
│
├── .github/
│   ├── copilot-instructions.md        # AI coding rules (schema, tests, swagger, security)
│   ├── dependabot.yml                 # Weekly dependency update PRs
│   ├── CODEOWNERS                     # Auto-assign reviewers
│   ├── PULL_REQUEST_TEMPLATE.md       # PR checklist
│   ├── ISSUE_TEMPLATE/                # Bug report & feature request forms
│   └── workflows/
│       ├── ci.yml                     # Lint, type-check, unit tests, e2e, build
│       ├── codeql.yml                 # SAST security analysis
│       ├── snyk.yml                   # Dependency vulnerability scanning
│       └── version-bump.yml           # Auto patch-bump on merge to main
├── docker-compose.yml                 # PostgreSQL 16 container
├── .editorconfig                      # Editor whitespace/indent rules
├── CONTRIBUTING.md                    # Setup guide & contribution workflow
├── LICENSE                            # MIT
├── SECURITY.md                        # Vulnerability reporting policy
└── package.json                       # npm workspace root
```

---

## API reference

The API self-documents via Swagger UI at **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)** when running locally.

### Auth (`/auth`)

| Method | Path             | Auth | Description                             |
| ------ | ---------------- | ---- | --------------------------------------- |
| `POST` | `/auth/register` | —    | Create a new user account               |
| `POST` | `/auth/login`    | —    | Log in, returns `{ accessToken, user }` |
| `GET`  | `/auth/me`       | JWT  | Return the authenticated user's profile |

### Plaid — user-scoped (`/plaid/me/*`)

All require a valid user JWT.

| Method   | Path                                 | Description                                                                                    |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `POST`   | `/plaid/me/link-token`               | Create a Plaid Link token to initialise the Link UI                                            |
| `POST`   | `/plaid/me/exchange-token`           | Exchange a `public_token` for an access token; stores a PlaidItem                              |
| `GET`    | `/plaid/me/items`                    | List this user's linked Plaid Items (access token omitted)                                     |
| `GET`    | `/plaid/me/accounts`                 | Aggregate accounts across all linked Items                                                     |
| `POST`   | `/plaid/me/balance/refresh`          | Force-refresh real-time balances (Plaid `/accounts/balance/get`)                               |
| `GET`    | `/plaid/me/transactions`             | Sync transactions for all Items (cursor-based)                                                 |
| `GET`    | `/plaid/me/auth`                     | ACH routing & account numbers (requires `auth` product)                                        |
| `GET`    | `/plaid/me/identity`                 | Account holder names, emails, phones, addresses (`identity` product)                           |
| `GET`    | `/plaid/me/liabilities`              | Credit cards, student loans, mortgages (`liabilities` product)                                 |
| `GET`    | `/plaid/me/investments/holdings`     | Brokerage holdings & securities (`investments` product)                                        |
| `GET`    | `/plaid/me/investments/transactions` | Investment transactions; `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (defaults to last 90 days) |
| `DELETE` | `/plaid/me/items/:id`                | Remove a linked Item and revoke access                                                         |

### Plaid — institutions (`/plaid/institutions/*`)

| Method | Path                         | Auth | Description                                             |
| ------ | ---------------------------- | ---- | ------------------------------------------------------- |
| `GET`  | `/plaid/institutions/search` | JWT  | Search institutions by name (`?query=...`, min 2 chars) |

### Plaid — sandbox demo (`/plaid/sandbox/*`)

Available to any authenticated user in sandbox mode. Bypasses Plaid Link for automated testing.

| Method | Path                                    | Description                                                                              |
| ------ | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `POST` | `/plaid/sandbox/create-item`            | Create and link a sandbox Item for the current user                                      |
| `GET`  | `/plaid/sandbox/accounts`               | Demo accounts via shared sandbox access token                                            |
| `GET`  | `/plaid/sandbox/transactions`           | Demo transactions via shared sandbox access token                                        |
| `POST` | `/plaid/sandbox/items/:id/reset-login`  | Force `ITEM_LOGIN_REQUIRED` on the Item (test Link update mode)                          |
| `POST` | `/plaid/sandbox/items/:id/fire-webhook` | Fire a sandbox webhook (`{ webhookCode }` in body)                                       |
| `POST` | `/plaid/sandbox/items/:id/transactions` | Inject custom sandbox transactions (Items created with `user_transactions_dynamic` only) |

### Plaid — admin (`/plaid/*`)

Require **admin** JWT.

| Method   | Path               | Description                           |
| -------- | ------------------ | ------------------------------------- |
| `GET`    | `/plaid/items`     | List all PlaidItems across all users  |
| `DELETE` | `/plaid/items/:id` | Remove any PlaidItem (admin override) |

### Admin (`/admin/*`)

Require **admin** JWT.

| Method  | Path                  | Description                                |
| ------- | --------------------- | ------------------------------------------ |
| `GET`   | `/admin/users`        | List all users (passwordHash omitted)      |
| `PATCH` | `/admin/users/:id`    | Update `role` or `email`                   |
| `GET`   | `/admin/sandbox-pool` | List configured Plaid sandbox institutions |

---

## Database

### Schema

| Table         | Purpose                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| `users`       | User accounts with role and email                                          |
| `plaid_items` | One row per linked Plaid Item per user (access token, institution, cursor) |

### Setup

```bash
# Dev database
createdb flamingo

# Test database (required for e2e tests)
createdb flamingo_test
```

### Migrations

SQL migration files live in `api/schema/`. They are numbered sequentially (`001_`, `002_`, …) and are idempotent (all use `IF NOT EXISTS` / `IF EXISTS` guards).

TypeORM `synchronize: true` is enabled in non-production environments, so schema changes from entity files are applied automatically on startup in development.

### Docker (PostgreSQL only)

```bash
docker compose up -d   # starts postgres:16-alpine on port 5432
```

---

## Testing

```bash
# Unit tests (from api/)
cd api && npm run test

# Unit tests in watch mode
cd api && npm run test:watch

# Unit tests with coverage report
cd api && npm run test:cov

# E2E tests (requires flamingo_test DB)
cd api && npm run test:e2e
```

Unit specs live alongside their source files (`*.spec.ts`). E2E specs are in `api/test/` and use Supertest against a real `flamingo_test` PostgreSQL database with Plaid mocked.

Coverage thresholds are enforced — `test:cov` will fail if lines, functions, or statements drop below the configured minimums in `api/package.json`.

---

## CI / Security

Four workflows run automatically on pull requests and pushes to `main`:

| Workflow           | Trigger                    | What it does                                                                  |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------- |
| `ci.yml`           | PR / push to main          | Lint, type-check, unit tests (with coverage), e2e tests, build all workspaces |
| `snyk.yml`         | PR / push to main          | Dependency CVE scan — blocks on high/critical. Results in Security tab        |
| `codeql.yml`       | PR / push to main + weekly | GitHub SAST analysis for JS/TS                                                |
| `version-bump.yml` | After CI passes on main    | Auto-increments patch version in changed workspaces                           |

[Dependabot](https://docs.github.com/en/code-security/dependabot) opens weekly PRs for outdated dependencies across all four workspaces.

```bash
# Run Snyk locally (requires SNYK_TOKEN env var or `snyk auth`)
npm run snyk:test

# Upload a dependency snapshot to the Snyk dashboard
npm run snyk:monitor
```

Add `SNYK_TOKEN` to your GitHub repo secrets to enable the Snyk workflow.

---

## Production build

```bash
npm run api:build        # compiles NestJS to api/dist/
npm run web:build        # Vite build to web/dist/
npm run web:build        # Vite build to web/dist/ (includes /admin route)
```
