# Flamingo Web

React + TypeScript + Vite frontend for Flamingo. Serves both the user dashboard (`/dashboard`) and the admin panel (`/admin`) from the same SPA.

> Canonical docs (env vars, API reference, architecture) live in the [repo root README](../README.md). This file covers only what is specific to working inside `web/`.

---

## Run locally

```bash
# from repo root — install all workspaces
npm install

# start the API in another terminal first, then:
cd web && npm run dev
```

Vite serves the app on <http://localhost:5173>. The Axios client points at `http://localhost:3000` by default; override with `VITE_API_BASE_URL` in `web/.env.local` if needed.

---

## Scripts

| Script            | Purpose                            |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Vite dev server with HMR           |
| `npm run build`   | Type-check + production build      |
| `npm run preview` | Serve the production build locally |
| `npm run lint`    | ESLint                             |

---

## Layout

```
src/
  main.tsx
  App.tsx
  api/          # Axios wrappers (auth, plaid, admin)
  components/   # AccountsGrid, TransactionsTable, admin/UsersTable, ...
  contexts/     # AuthContext (JWT state, login/logout)
  pages/        # LoginPage, RegisterPage, DashboardPage, admin/AdminDashboardPage
  types/        # Shared TS types mirroring API DTOs
  utils/        # Helpers
```

---

## Routing

- `/login`, `/register` — public
- `/dashboard` — authenticated users
- `/admin` — users with the `admin` role only

Auth state is driven by `AuthContext`; the `api/` Axios instances attach the JWT and refresh on `401` via the `/auth/refresh` endpoint.
