# Vite + React Router Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Next.js App Router and Server Actions with a Vite React SPA, React Router, and a same-origin Express JSON API while preserving the existing approval loop, Prisma/SQLite data model, authentication, access control, and visual system.

**Architecture:** `src/client` owns browser routing and rendering; `src/server` owns Express routes, cookie sessions, Prisma queries, and mutations. The Vite dev server proxies `/api` and `/auth` to Express; production Express serves `dist` and falls back to `index.html` for client routes.

**Tech Stack:** React 19, Vite 8.2.2, React Router DOM 7.18.3, Express 5.2.1, Prisma 6, Tailwind CSS 4, Vitest 4.1.11, Supertest 7.2.2, TypeScript 5.

## Global Constraints

- Preserve current routes under `/login`, `/staff`, `/client`, and `/proto/checkout`.
- Keep Prisma and SQLite server-only; no database code may enter the Vite client bundle.
- Keep the current four-role Company Admin / Member × Reviewer / Approver behavior.
- Preserve server-side authorization for every query and mutation.
- Keep the dev-inbox magic-link and development account switcher.
- Do not add production email, Salesforce, object storage, blockers, phases, or notifications UI.
- Tests must be written and observed failing before each production behavior is implemented.

---

### Task 1: Toolchain and HTTP Foundation

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `eslint.config.mjs`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/server/app.ts`
- Create: `src/server/index.ts`
- Create: `src/server/app.test.ts`

**Interfaces:**
- Produces: `createApp(): Express`, `GET /api/health -> { ok: true }`

- [ ] Write `src/server/app.test.ts` asserting `GET /api/health` returns status 200 and `{ ok: true }`.
- [ ] Run `npm test -- src/server/app.test.ts` and verify failure because `createApp` does not exist.
- [ ] Install the pinned dependencies above; add `dev`, `dev:client`, `dev:server`, `build`, `start`, `test`, and `lint` scripts.
- [ ] Implement `createApp`, Express JSON/urlencoded middleware, production static serving, and `src/server/index.ts`.
- [ ] Run the test and verify it passes.

### Task 2: Framework-Neutral Authentication

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/server/auth-routes.ts`
- Create: `src/server/auth-routes.test.ts`
- Modify: `src/server/app.ts`

**Interfaces:**
- Produces: token/session helpers without `next/headers`
- Produces: `POST /api/auth/magic-link`, `GET /auth/verify`, `POST /auth/logout`, `GET /api/session`, `POST /api/dev/switch-user`

- [ ] Write tests for missing/unknown magic-link users, valid token consumption with an HTTP-only cookie, logout cookie clearing, unauthenticated session response, and development account switching.
- [ ] Run the focused tests and verify expected failures.
- [ ] Refactor `src/lib/auth.ts` so session creation returns `{ token, expiresAt }` and current-user lookup accepts a token; cookie reading/writing stays in Express routes.
- [ ] Implement auth routes with the existing `cp_session`, 14-day session TTL, and 15-minute single-use magic links.
- [ ] Run focused and full tests.

### Task 3: Query and Mutation API

**Files:**
- Modify: `src/lib/members.ts`
- Create: `src/server/queries.ts`
- Create: `src/server/mutations.ts`
- Create: `src/server/api-routes.ts`
- Create: `src/server/api-routes.test.ts`
- Modify: `src/server/app.ts`

**Interfaces:**
- Produces: authenticated `GET /api/bootstrap`, `/api/staff/companies`, `/api/staff/companies/:companyId`, `/api/staff/companies/:companyId/members`, `/api/staff/companies/:companyId/members/:memberId`, `/api/staff/projects/:projectId`, `/api/staff/deliverables/:deliverableId`, `/api/client/projects`, `/api/client/projects/:projectId`, `/api/client/deliverables/:deliverableId`, `/api/client/members`, `/api/client/members/:memberId`
- Produces: `POST /api/actions/:action` for the existing company, member, project, deliverable, version, comment, thread, decision, and account-switch mutations
- Uses JSON mutation bodies; successful mutations return `{ ok: true, redirectTo?: string, data?: unknown }`

- [ ] Write API tests proving unauthenticated requests return 401, cross-company requests return 404/403, reviewers cannot decide, and staff/company-admin member management remains authorized.
- [ ] Run focused tests and verify expected failures.
- [ ] Move data loading from App Router pages into role-guarded query functions.
- [ ] Move business logic from Server Actions into framework-neutral mutation functions that accept the authenticated actor.
- [ ] Add Express route adapters and consistent JSON errors.
- [ ] Run focused and full tests.

### Task 4: Vite Client Shell and Router

**Files:**
- Create: `src/client/main.tsx`
- Create: `src/client/router.tsx`
- Create: `src/client/api.ts`
- Create: `src/client/AppShell.tsx`
- Create: `src/client/RouteState.tsx`
- Create: `src/client/router.test.tsx`
- Move: `src/app/globals.css` to `src/client/globals.css`
- Modify: `src/components/ThemeScript.tsx`
- Modify: `src/components/TopNav.tsx`
- Modify: `src/components/AccountCluster.tsx`
- Modify: `src/components/FilterList.tsx`
- Modify: `src/components/members/MembersDirectory.tsx`
- Modify: `src/components/members/MembersWorkspace.tsx`

**Interfaces:**
- Produces: `api.get`, `api.action`, route-level loading/error/redirect behavior, authenticated staff/client shells.

- [ ] Write router tests for `/` role redirection, unauthenticated redirect to `/login`, staff/client shell protection, and a not-found route.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement the Vite entry, theme bootstrap script in `index.html`, browser router, query/action client, and guarded layouts.
- [ ] Replace `next/link`/`next/navigation` usage in shared components with React Router equivalents.
- [ ] Run focused and full tests.

### Task 5: Login, Staff, and Client Pages

**Files:**
- Create: `src/client/pages/LoginPage.tsx`
- Create: `src/client/pages/StaffPages.tsx`
- Create: `src/client/pages/ClientPages.tsx`
- Create: `src/client/pages/PrototypePage.tsx`
- Modify: `src/components/DeliverableViewer.tsx`
- Modify: `src/components/members/InviteMemberPanel.tsx`
- Modify: `src/components/members/MemberDetail.tsx`

**Interfaces:**
- Consumes: route data endpoints and `api.action`
- Produces: all 14 existing user-facing routes with matching forms, redirects, and refresh behavior

- [ ] Write component/router tests for login dev-link rendering, company creation redirect, project/deliverable lists, reviewer-hidden decision controls, and member directory/detail navigation.
- [ ] Run focused tests and verify expected failures.
- [ ] Port server-rendered pages to route components that fetch JSON and render existing visual primitives.
- [ ] Replace Server Action calls with `api.action`, then revalidate route data after success.
- [ ] Preserve query-string version switching in `DeliverableViewer`.
- [ ] Run focused and full tests.

### Task 6: Remove Next.js and Document the New Stack

**Files:**
- Delete: `src/app/**`
- Delete: `src/lib/actions.ts`
- Delete: `src/lib/guards.ts`
- Delete: `src/lib/dev-accounts.ts`
- Delete: `next.config.ts`
- Delete: `next-env.d.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-27-v1-design-approval-mvp.md`
- Modify: `artifacts/discovery/PRD-v1.0.md`
- Modify: `artifacts/discovery/discovery_summary.md`

**Interfaces:**
- Produces: zero runtime/build imports from `next/*`; C-001 resolved as Vite + React Router + Express API.

- [ ] Search for `next/`, `"use server"`, `.next`, and Server Action form bindings; verify only historical prose remains where intentionally retained.
- [ ] Delete superseded App Router/Server Action files and remove Next dependencies/configuration.
- [ ] Update setup, architecture, route, build, and migration documentation; close C-001 while leaving email/Salesforce deferrals unchanged.
- [ ] Run dependency install to refresh `package-lock.json`.

### Task 7: Full Verification

**Files:**
- Verify all changed files.

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run lint` and require zero errors.
- [ ] Run `npm run build` and require a successful Vite client build plus server TypeScript check.
- [ ] Run `npm run db:seed`, start the production server, and smoke-check `/api/health`, `/login`, `/staff`, `/client`, and `/proto/checkout`.
- [ ] Re-run the Next-specific import search and confirm no production-code matches.
