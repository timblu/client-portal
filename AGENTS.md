# Client Review Portal — agent notes

## Stack

- **Client:** Vite 8, React 19, React Router 7 (`src/client`)
- **Server:** Express 5 JSON API, cookie sessions, Prisma (`src/server`)
- **Data:** Prisma + SQLite (`prisma/dev.db` locally)

## Conventions

- Browser routing lives in `src/client/router.tsx`; pages fetch JSON from `/api/*` and call mutations via `POST /api/actions/:action`.
- Prisma and database code must stay server-side (`src/server`, `src/lib` consumed only by the server). Do not import `@/lib/db` from client code.
- Auth uses HTTP-only `cp_session` cookies. Magic links verify at `GET /auth/verify`; development exposes links on the login page ("Dev inbox").
- In development, run `npm run dev` — Vite on port 5173 proxies `/api` and `/auth` to Express on port 3001.
- In production, `npm run build` then `npm start` serves the Vite `dist` bundle and API from Express (default port 3001).
