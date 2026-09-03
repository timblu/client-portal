# Client Review Portal

A private, invite-only client review portal. Staff publish versioned designs, docs, and hosted
prototypes; clients pin comments and record Approve / Request changes / Reject decisions per
deliverable. The UI is a monochrome product surface (not a wireframe). See
[`docs/superpowers/specs/2026-08-25-monochrome-product-visual-design.md`](docs/superpowers/specs/2026-08-25-monochrome-product-visual-design.md).

## Stack

| Layer | Technology |
|---|---|
| Client | Vite 8, React 19, React Router 7 (`src/client`) |
| Server | Express 5 JSON API + cookie sessions (`src/server`) |
| Data | Prisma 6 + SQLite (`prisma/dev.db`) |
| Styling | Tailwind CSS 4 + hand-rolled monochrome primitives (`src/client/globals.css`) |
| Auth | Email magic-link, invite-only, no passwords |

The schema is Salesforce-shaped (`Company` ≈ Account, client `User` ≈ Contact) so a future move
to a live Salesforce org does not require an object-model rewrite. Live Salesforce is explicitly
deferred for this slice.

There is no email provider wired up: requesting a link surfaces it directly on the login page
under **Dev inbox** (development only).

## Getting started

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db
npm run db:seed          # two companies, sample deliverables, comments
npm run dev              # Vite :5173 + Express :3001
```

Open http://localhost:5173/login. Vite proxies `/api` and `/auth` to the Express server on port
3001.

### Demo accounts

All accounts are invite-only; sign in via magic link (or use the dev inbox link on the login page).

| Email | Role |
|---|---|
| `sam@agency.test` | Staff (sees every company) |
| `alex@northwind.test` | Client, Company Admin — Northwind (all projects) |
| `casey@northwind.test` | Client, Member — Approver on Storefront (Northwind) |
| `priya@northwind.test` | Client, Member — Reviewer on Storefront (Northwind) |
| `devon@alpine.test` | Client, Member — Approver on Member Portal (Alpine) |

## Commands

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server and Express API together |
| `npm run dev:client` | Vite only (port 5173) |
| `npm run dev:server` | Express only (port 3001) |
| `npm run build` | Build client to `dist/` and type-check server |
| `npm start` | Production Express server (serves `dist/` + API, default port 3001) |
| `npm test` | Vitest unit and integration tests |
| `npm run lint` | ESLint (TypeScript + React) |
| `npm run db:seed` | Reseed demo data |

Set `PORT` to change the Express listen port. Set `DATABASE_URL` for a non-default SQLite path.

## Architecture

```
Browser (Vite SPA, React Router)
  ├── fetch /api/*        → JSON data + mutations
  ├── GET /auth/verify    → magic-link cookie + redirect
  └── POST /auth/logout   → clear session

Express (src/server)
  ├── auth-routes.ts      → magic link, session, dev account switcher
  ├── api-routes.ts       → role-guarded queries + POST /api/actions/:action
  ├── queries.ts          → read models (staff/client scopes)
  └── mutations.ts        → business logic (formerly Server Actions)
```

In development, Vite serves the SPA and proxies API/auth traffic to Express. In production,
Express serves the built `dist/` assets and falls back to `index.html` for client-side routes.

Prisma and database code stay server-side. Do not import `@/lib/db` from client code.

## Routes

| Path | Audience | Purpose |
|---|---|---|
| `/` | All | Redirect to `/staff` or `/client` by role |
| `/login` | Public | Magic-link request + dev inbox |
| `/staff` | Staff | Company list |
| `/staff/companies/:companyId` | Staff | Company detail, projects |
| `/staff/companies/:companyId/members` | Staff | Member directory |
| `/staff/companies/:companyId/members/:memberId` | Staff | Member detail |
| `/staff/projects/:projectId` | Staff | Project deliverables |
| `/staff/deliverables/:deliverableId` | Staff | Deliverable viewer + version upload |
| `/client` | Client | Project home |
| `/client/projects/:projectId` | Client | Project deliverables |
| `/client/deliverables/:deliverableId` | Client | Deliverable viewer + decisions |
| `/client/members` | Company admin | Member directory |
| `/client/members/:memberId` | Company admin | Member detail |
| `/proto/checkout/:screen` | Public | Hosted multi-page prototype demo (iframe target; screens: cart, shipping, confirmation) |

## Source layout

```
src/
├── client/           # Vite entry, router, pages, fetch client
│   ├── main.tsx
│   ├── router.tsx
│   ├── api.ts
│   ├── AppShell.tsx
│   ├── RouteState.tsx
│   ├── globals.css
│   └── pages/
├── server/           # Express app, routes, queries, mutations
│   ├── app.ts
│   ├── index.ts
│   ├── auth-routes.ts
│   ├── api-routes.ts
│   ├── queries.ts
│   └── mutations.ts
├── components/       # Shared UI (DeliverableViewer, members, nav)
└── lib/              # Framework-neutral helpers (auth, access, db, format)
prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

## Auth and dev inbox

1. POST `/api/auth/magic-link` with `{ email }` creates a single-use token (15 min TTL).
2. In development, the response includes `devLink` (raw token) and the login page renders a
   clickable verify URL under **Dev inbox**.
3. GET `/auth/verify?token=…` sets an HTTP-only `cp_session` cookie (14-day TTL) and redirects
   to `/staff` or `/client`.
4. GET `/api/session` returns the current user and (in dev) account-switch targets.
5. POST `/api/dev/switch-user` swaps the session to another seeded user (development only).

## API overview

**Queries** (authenticated GET):

- `/api/bootstrap`, `/api/staff/companies`, `/api/staff/companies/:companyId`, …
- `/api/client/projects`, `/api/client/deliverables/:deliverableId`, …

**Mutations** (authenticated POST):

- `/api/actions/:action` — company, member, project, deliverable, version, comment, thread,
  decision, and account-switch actions. Body is JSON; success returns
  `{ ok: true, redirectTo?: string, data?: unknown }`.

## Known deferred items

- Live Salesforce read/write — data model mirrors Salesforce but persists to SQLite.
- Production email delivery for magic links.
- Version compare (side-by-side / overlay).
- File uploads are pasted URLs/paths (`/seed/*.svg`) rather than real object storage.
- Blockers, phases, and notification inbox UI were removed in the V1 cut; underlying Prisma
  models remain but are unused.

## Migration note

This repository previously used Next.js App Router and Server Actions. The stack is now Vite +
React Router + Express API. See
[`docs/superpowers/plans/2026-09-01-vite-react-router-migration.md`](docs/superpowers/plans/2026-09-01-vite-react-router-migration.md)
for the migration plan (C-001 resolved).
