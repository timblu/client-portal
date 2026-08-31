# Client Review Portal (wireframe core)

A private, invite-only client review portal. Staff publish versioned designs, docs, and
hosted prototypes; clients pin comments and record Approve / Request changes / Reject
decisions per deliverable; a global phase rail rolls up progress. This slice is a monochrome product UI (not a wireframe). See
[`docs/superpowers/specs/2026-08-25-monochrome-product-visual-design.md`](docs/superpowers/specs/2026-08-25-monochrome-product-visual-design.md).

## Stack

- Next.js App Router + TypeScript, Server Actions for all mutations
- Prisma + SQLite (`prisma/dev.db`) — schema is Salesforce-shaped (`Company` ≈ Account,
  client `User` ≈ Contact) so a future move to a live Salesforce org doesn't require an
  object-model rewrite. Live Salesforce is explicitly deferred for this slice.
- Tailwind CSS and hand-rolled monochrome primitives in `src/app/globals.css`.
- Auth is email magic-link, invite-only, no passwords. There is no email provider wired up:
  requesting a link surfaces it directly on the page under "Dev inbox."

## Getting started

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db
npm run db:seed          # two companies, sample deliverables, comments, blockers
npm run dev
```

Open http://localhost:3000/login. Demo accounts (all invite-only, sign in via magic link):

| Email | Role |
|---|---|
| `sam@agency.test` | Staff (sees every company) |
| `alex@northwind.test` | Client, Company Admin — Northwind (all projects) |
| `casey@northwind.test` | Client, Member — Approver on Storefront (Northwind) |
| `priya@northwind.test` | Client, Member — Reviewer on Storefront (Northwind) |
| `devon@alpine.test` | Client, Member — Approver on Member Portal (Alpine) |

## Structure

- `src/app/staff/*` — company list, member invites, project/deliverable management, blockers
- `src/app/client/*` — project home (phase rail + "waiting on you"), deliverable viewer, blockers
- `src/app/proto/checkout` — a small self-hosted interactive prototype, standing in for a
  real hosted prototype URL, embedded via iframe in the deliverable viewer
- `src/components/DeliverableViewer.tsx` — the core review surface: file gallery, version
  switcher, Interact/Comment mode toggle for prototypes, click-to-pin comments, comments
  sidebar, and the Approve/Changes requested/Reject decision flow
- `src/lib/actions.ts` — every mutation (invites, versions, comments, decisions, blockers)
- `prisma/schema.prisma` — Company, User, Project, Phase (global list), Deliverable,
  Version, CommentThread, Comment, Blocker

## Known deferred items (see plan for full list)

- Live Salesforce read/write — the data model mirrors Salesforce's shape but persists to
  SQLite for this slice.
- Phase names are placeholders (Discovery / Design / Build / Launch) — replace with the
  real delivery process in `prisma/seed.ts` and any project-creation flow.
- Version compare (side-by-side / overlay) is out of scope for this slice.
- File uploads are pasted URLs/paths (`/seed/*.svg`) rather than real object storage.
