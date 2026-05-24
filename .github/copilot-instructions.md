# Flamingo — Copilot Workspace Instructions

These rules apply to every change made in this repository. Follow them automatically without being asked.

---

## 0. Security

- All code must be free of OWASP Top 10 vulnerabilities. Catch and fix insecure patterns immediately (SQL injection, XSS, broken auth, hard-coded secrets, etc.).
- Never introduce a new `npm` dependency without checking it does not have known high/critical CVEs. Run `npm snyk:test` (or `npx snyk test`) locally before committing new packages.
- Do not hard-code secrets, credentials, API keys, or JWTs anywhere in source or test files.
- The `.github/workflows/snyk.yml` CI workflow runs `snyk test --all-projects --severity-threshold=high` on every PR and push to main. A failing Snyk scan blocks the merge.

---

## 1. Schema Maintenance

### Triggers
Update `api/schema/` whenever ANY of the following happens:

- A `@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, or `@UpdateDateColumn` is added, renamed, removed, or its options change (type, length, nullable, default, unique)
- A `@Index`, `@Unique`, or `@Check` constraint is added or removed
- An enum value is added, removed, or renamed
- A new `@Entity` (table) is added or an existing one is removed

### Required actions

1. **Incremental migration file** — create `api/schema/00N_<snake_case_description>.sql` (next available number) with the exact DDL needed (`ALTER TABLE`, `CREATE INDEX`, `DROP CONSTRAINT`, `ADD COLUMN`, etc.).
2. **Baseline sync** — ensure `api/schema/001_create_users.sql` (and any other full-table baseline files) reflect the *current* state of the entity. If a column was dropped, remove it; if a constraint was added, add it.
3. **Seed data** — if the change affects existing seed rows (new NOT NULL column, renamed column, etc.), update or create a file in `api/schema/data/`.
4. **Comment in the SQL file** — include a one-line comment at the top explaining the reason for the change and the corresponding entity field.

### Schema file conventions
- Files are numbered sequentially; never renumber or modify a file once it has been applied to any environment.
- Use `IF NOT EXISTS` / `IF EXISTS` guards so files are idempotent.
- Always qualify the table name; never rely on a `SET search_path`.

---

## 2. Test Maintenance

### Triggers
Create or update tests whenever ANY of the following happens:

- A new service method is added or an existing one changes its behavior
- A new controller endpoint is added, modified, or removed
- A new guard, decorator, pipe, or middleware is added
- Business logic in `auth`, `users`, `yodlee`, or `admin` changes
- A new module or entity is introduced

### Required actions

1. **Unit test** (`api/src/**/*.spec.ts`) — add or update the spec file that mirrors the source file. Cover:
   - Happy path (returns expected value/shape)
   - Each error branch (`NotFoundException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`, etc.)
   - Edge cases (empty collections, null fields, sandbox vs. production mode)

2. **E2E / integration test** (`api/test/*.e2e-spec.ts`) — add or update a request-level test for every new HTTP endpoint. Cover:
   - `200`/`201`/`204` success responses
   - `400` bad request / validation failure
   - `401` unauthenticated (missing/invalid JWT)
   - `403` forbidden (wrong role)
   - `404`/`409` as applicable

3. **Mock external services** — never call the real Yodlee API or any external HTTP service in tests. Use `mockYodleeService` from `api/test/helpers/create-test-app.ts`.

4. **Verify** — run `npm run test` and `npm run test:e2e` from `api/` before finalising any change.

### Test conventions
- Unit tests mock all external dependencies (TypeORM repositories, JwtService, ConfigService, bcrypt, YodleeService).
- E2E tests use the `flamingo_test` database (see `api/.env.test`). Run `createdb flamingo_test` once to create it.
- Each e2e test file cleans up its own data in `afterAll`.
- Test users must use clearly identifiable usernames (prefix `e2e_`) so they are easy to identify and clean up.
- Never hard-code real Yodlee credentials, JWT secrets, or passwords in test files.

---

## 3. General Conventions

- SQL migration numbers are sequential (`001`, `002`, …) and gap-free.
- TypeORM `synchronize: true` is only enabled for `NODE_ENV !== 'production'`.
- All new endpoints must have a corresponding `@ApiOperation` Swagger annotation.
- Admin-only endpoints must use the `@AdminOnly()` composed decorator (not manual guard composition).
- User-scoped Yodlee endpoints live under `/yodlee/me/` and resolve `yodleeLoginName` from the authenticated user — never accept `loginName` as a query param for user-facing routes.

---

## 4. Swagger & Metadata

### Triggers
Update Swagger decorators and DTO metadata whenever ANY of the following happens:

- A field is added, renamed, removed, or its type / nullability changes in a DTO
- A new endpoint is added or an existing one's behavior, path, or response shape changes
- A guard or role requirement changes on an endpoint
- A DTO field gains or loses a validation constraint

### Required actions

1. **`@ApiOperation`** — every endpoint must have `summary` and, for non-trivial behavior, a `description`.
2. **`@ApiBody`** — add on `POST` / `PATCH` endpoints that accept a DTO so Swagger renders the request schema.
3. **`@ApiPropertyOptional` / `@ApiProperty`** — every DTO field must have:
   - `description` explaining the field's purpose
   - `example` showing a realistic value
   - `nullable: true` when the field can be `null`
   - `type` when TypeScript inference is insufficient (e.g. `type: String`)
4. **Response decorators** — use `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiNoContentResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`, etc. to document every success **and** error status code the endpoint can return.
5. **Enum descriptions** — when a field is an `enum`, set `enum: EnumType` so Swagger lists the valid values.

---

## 5. README Maintenance

### Triggers
Update `README.md` (repo root) whenever ANY of the following happens:

- A new API endpoint is added, removed, renamed, or its method/path/auth requirement changes
- A new workspace script is added or an existing one is renamed
- An environment variable is added, removed, or renamed
- A new workspace or service is added
- The database setup steps change (new migration, new seed, `createdb` requirement)
- A new npm script relevant to development, testing, or building is added
- The port a service runs on changes
- The test setup or commands change

### Required actions

1. Keep the **API reference tables** in sync with the actual controller routes.
2. Keep the **Configuration** section in sync with all `.env` variables.
3. Keep the **Scripts** section and **Quick start** steps accurate.
4. Do not add implementation details or internal architecture notes to the README — keep it operator-focused (how to run, configure, and use the project).
