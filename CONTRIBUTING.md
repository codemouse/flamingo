# Contributing to Flamingo

Thank you for your interest in contributing! This document explains how to get set up locally, the conventions we follow, and the pull request process.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **PostgreSQL** ≥ 14
- **npm** ≥ 10 (comes with Node.js)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/codemouse/flamingo.git
cd flamingo

# 2. Install all workspace dependencies
npm install

# 3. Create the development database
createdb flamingo_dev

# 4. Create the test database (for e2e tests)
createdb flamingo_test

# 5. Copy and fill in environment variables
cp api/.env.example api/.env
cp api/.env.example api/.env.test   # update DB name to flamingo_test

# 6. Run database migrations
psql -d flamingo_dev -f api/schema/001_create_users.sql
psql -d flamingo_dev -f api/schema/002_add_yodlee_login_name.sql
psql -d flamingo_dev -f api/schema/003_drop_email_unique.sql
psql -d flamingo_dev -f api/schema/004_drop_yodlee_login_name_unique.sql

# 7. (Optional) seed data
psql -d flamingo_dev -f api/schema/data/001_seed_brian1_yodlee.sql
psql -d flamingo_dev -f api/schema/data/003_seed_admin_user.sql

# 8. Start all services in dev mode
npm run dev
```

Services start at:

| Service          | URL                       |
| ---------------- | ------------------------- |
| API (NestJS)     | http://localhost:3000     |
| Swagger UI       | http://localhost:3000/api |
| Web (Vite)       | http://localhost:5173     |
| Admin Web (Vite) | http://localhost:5174     |

---

## Project Structure

```
flamingo/
├── api/          # NestJS REST API
├── web/          # End-user Vite + React frontend
├── admin-web/    # Admin Vite + React frontend
└── package.json  # Workspace root (concurrently dev runner)
```

---

## Development Workflow

1. **Fork** the repo and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes following the conventions below.
3. Run tests and ensure they pass before opening a PR.
4. Open a pull request against `main`.

---

## Coding Standards

- **TypeScript** — all new code must be TypeScript; `noImplicitAny` is off but types should be explicit where practical.
- **ESLint + Prettier** — run `npm run lint` (api) before committing; formatting is enforced by Prettier.
- **NestJS conventions** — new endpoints need `@ApiOperation` Swagger annotations; admin-only routes use `@AdminOnly()`.
- **Security** — no hard-coded secrets, no new dependencies with known high/critical CVEs (`npm run snyk:test`).
- **Schema changes** — any entity change requires a new incremental migration in `api/schema/` (see the [schema maintenance rules](/.github/copilot-instructions.md)).

---

## Testing

```bash
# Unit tests
cd api && npm test

# Unit tests with coverage
cd api && npm run test:cov

# E2E tests (requires flamingo_test DB)
cd api && npm run test:e2e
```

- Unit tests live in `api/src/**/*.spec.ts` alongside the source file they test.
- E2E tests live in `api/test/*.e2e-spec.ts`.
- Never call external APIs (Yodlee, etc.) in tests — use the mocks in `api/test/helpers/`.
- New service methods and controller endpoints **must** have corresponding tests.

---

## Pull Request Process

1. Ensure `npm test` and `npm run build` pass locally.
2. Fill in the PR template — check all applicable boxes.
3. PRs require at least **one approving review** before merge.
4. Squash-merge is preferred to keep a clean history.
5. The Snyk CI check must pass (no new high/critical vulnerabilities).
