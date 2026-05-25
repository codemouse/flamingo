# Flamingo

Personal finance dashboard powered by [Yodlee](https://developer.yodlee.com/). Users connect bank accounts via FastLink and see their balances and transactions in one place. Admins manage users and Yodlee sandbox assignments from a separate panel.

---

## Workspaces

| Directory    | Package     | Port     | Purpose                     |
| ------------ | ----------- | -------- | --------------------------- |
| `api/`       | `api`       | **3000** | NestJS REST API + Swagger   |
| `web/`       | `web`       | **5173** | User-facing React dashboard |
| `admin-web/` | `admin-web` | **5174** | Admin React panel           |

---

## Prerequisites

| Tool       | Min version |
| ---------- | ----------- |
| Node.js    | 22          |
| npm        | 10          |
| PostgreSQL | 16          |

---

## Quick start (all three services)

```bash
# 1. Install all workspace dependencies from the repo root
npm install

# 2. Copy and fill in the API environment file
cp api/.env.example api/.env   # edit values — see Configuration below

# 3. Create the development database
createdb flamingo

# 4. Start everything concurrently
npm run dev
```

`npm run dev` runs `api`, `web`, and `admin-web` via [concurrently](https://github.com/open-cli-tools/concurrently) with colour-coded prefixes.

---

## Running services individually

```bash
npm run api          # NestJS (watch mode)
npm run web          # Vite dev server for web/
npm run admin-web    # Vite dev server for admin-web/
```

Or from within each workspace:

```bash
cd api       && npm run start:dev
cd web       && npm run dev
cd admin-web && npm run dev
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

# ── Yodlee ───────────────────────────────────────────────────────────────────
YODLEE_BASE_URL=https://sandbox.api.yodlee.com/ysl
YODLEE_CLIENT_ID=<your-client-id>
YODLEE_CLIENT_SECRET=<your-client-secret>
YODLEE_ADMIN_LOGIN_NAME=<your-admin-loginName>
YODLEE_SANDBOX_LOGIN_NAME=sbMem68c09b712b5831   # shared demo user
YODLEE_SANDBOX_USER_POOL=sbMem68c09b712b5831,sbMem68c09b712b5832   # comma-separated pool
YODLEE_FASTLINK_URL=https://node.sandbox.yodlee.com/authenticate/restserver/

# ── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET=change-me-use-a-long-random-string   # min 32 chars in production
JWT_EXPIRES_IN=7d
```

> **Never commit `.env` files.** They are git-ignored. Use environment-specific secrets managers (AWS Secrets Manager, GitHub Actions secrets, etc.) in CI/CD.

### Frontend env vars

`web/` and `admin-web/` both talk to the API via a preconfigured Axios client. No `.env` file is needed for local development — both point to `http://localhost:3000` by default.

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
│   │   └── yodlee/             # Yodlee integration & "me" endpoints
│   ├── test/                   # E2E specs (Supertest)
│   ├── schema/                 # SQL migration files (001_, 002_, …)
│   │   └── data/               # Seed data SQL
│   ├── .env                    # Local env (git-ignored)
│   └── .env.test               # Test env (git-ignored)
│
├── web/                        # User React app (Vite + TypeScript)
│   └── src/
│       ├── api/                # Axios wrappers (auth, yodlee)
│       ├── components/         # AccountsGrid, AccountsManager, TransactionsTable, …
│       ├── contexts/           # AuthContext
│       └── pages/              # LoginPage, RegisterPage, DashboardPage
│
├── admin-web/                  # Admin React app (Vite + TypeScript)
│   └── src/
│       ├── api/                # Axios wrappers (admin)
│       ├── components/         # UsersTable, StatsCards
│       └── pages/              # LoginPage, DashboardPage
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

### Yodlee — user-scoped (`/yodlee/me/*`)

All require a valid user JWT. The user must have a `yodleeLoginName` assigned (done by an admin or automatically on sandbox registration).

| Method   | Path                      | Description                                                        |
| -------- | ------------------------- | ------------------------------------------------------------------ |
| `GET`    | `/yodlee/me/accounts`     | List linked financial accounts                                     |
| `GET`    | `/yodlee/me/transactions` | List transactions (`fromDate`, `toDate`, `accountId`, `top`)       |
| `GET`    | `/yodlee/me/token`        | Returns `{ accessToken, fastLinkUrl }` for FastLink initialisation |
| `PATCH`  | `/yodlee/me/accounts/:id` | Update account metadata (e.g. `nickname`)                          |
| `DELETE` | `/yodlee/me/accounts/:id` | Remove a linked account (204 No Content)                           |

### Yodlee — sandbox demo (`/yodlee/sandbox/*`)

Available to any authenticated user. Returns pre-populated demo data.

| Method | Path                           | Description       |
| ------ | ------------------------------ | ----------------- |
| `GET`  | `/yodlee/sandbox/accounts`     | Demo accounts     |
| `GET`  | `/yodlee/sandbox/transactions` | Demo transactions |

### Yodlee — admin (`/yodlee/*`)

Require **admin** JWT.

| Method | Path                           | Description                                 |
| ------ | ------------------------------ | ------------------------------------------- |
| `POST` | `/yodlee/token`                | Get a Yodlee access token for any loginName |
| `GET`  | `/yodlee/user`                 | Get Yodlee user details                     |
| `GET`  | `/yodlee/accounts`             | Get accounts for any user                   |
| `GET`  | `/yodlee/accounts/:id`         | Get a specific account                      |
| `GET`  | `/yodlee/transactions`         | Get transactions for any user               |
| `GET`  | `/yodlee/transactions/summary` | Transaction summary for any user            |
| `GET`  | `/yodlee/providers`            | List financial institution providers        |
| `GET`  | `/yodlee/providers/:id`        | Get a specific provider                     |

### Admin (`/admin/*`)

Require **admin** JWT.

| Method  | Path                  | Description                                  |
| ------- | --------------------- | -------------------------------------------- |
| `GET`   | `/admin/users`        | List all users (passwordHash omitted)        |
| `PATCH` | `/admin/users/:id`    | Update `role`, `email`, or `yodleeLoginName` |
| `GET`   | `/admin/sandbox-pool` | List the configured Yodlee sandbox user pool |

---

## Database

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

Unit specs live alongside their source files (`*.spec.ts`). E2E specs are in `api/test/` and use Supertest against a real `flamingo_test` PostgreSQL database with Yodlee mocked.

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
npm run admin-web:build  # Vite build to admin-web/dist/
```

Set `NODE_ENV=production` in the API environment to disable TypeORM `synchronize` and run migrations explicitly via your deployment pipeline.
