# V1 MVP: design approval

Date: 2026-08-27
Status: approved for implementation

## Outcome

Cut the current review-portal slice down to the smallest loop that gets a design (or doc / prototype)
to a decision: staff publishes a version, the client comments on it, and an approver records
Approve / Request changes / Reject. No new capability is added — this is a scope reduction of the
existing app.

Success looks like: a new person can log in as staff, invite a client (approver) and a second
client (comment-only), publish a design version and a prototype version, have the comment-only
client pin a comment, and have the approver request changes and then approve — without ever
seeing a blocker, a phase rail, or a notification inbox page.

## Constraints

- No new features: no production email/SMTP, no object storage, no Salesforce, no version
  compare. These stay deferred exactly as documented in the README.
- Keep the monochrome visual system from
  [`docs/superpowers/specs/2026-08-25-monochrome-product-visual-design.md`](2026-08-25-monochrome-product-visual-design.md)
  unchanged; this is a scope cut, not a redesign.
- Keep the existing SQLite schema shape (Company/User/Project/Deliverable/Version/CommentThread/
  Comment). Do not run a destructive migration for this cut — unused columns/models are simply
  no longer surfaced in the UI.

## In scope (the loop)

1. **Staff** creates a company, invites members, and marks each member Approver or comment-only
   (`isApprover` on `User`, unchanged).
2. **Staff** creates a project, then a deliverable with its first version: static image, markdown,
   or hosted prototype URL (unchanged `VersionKind`).
3. **Client** signs in via the existing invite-only magic link (dev inbox on the login page — no
   SMTP provider).
4. **Client** opens a project, opens a deliverable, and pins/replies on comments in the full
   `DeliverableViewer` (file gallery, version switcher, Interact/Comment toggle for prototypes,
   comments sidebar) — unchanged.
5. **Approver only** (client with `isApprover = true`) records Approve / Request changes / Reject
   on the current version. Comment-only clients cannot see or trigger the decision controls.

### Navigation clients and staff still need

Removing the notification inbox does not mean clients land nowhere. After login they still see:

- A project list (or an automatic redirect when the company has exactly one project).
- A flat deliverable list per project with a decision badge — no phase grouping.
- A "waiting on you" grouping of deliverables whose current version is still `PENDING`, since that
  is core to the approval loop, not the removed notification surface.

Staff keep: company list, company detail (members + projects), project detail (deliverable list +
add-deliverable / add-version forms), and the full deliverable viewer.

## Out of scope for this cut

- Blockers: `Blocker`/`BlockerComment` pages, the blocker board component, and the blocker actions
  (`createBlocker`, `updateBlockerStatus`, `addBlockerComment`). The Prisma models stay in the
  schema (no migration) but are not exercised by any UI or seed data.
- The global phase rail and assigning deliverables to Discovery/Design/Build/Launch. The `Phase`
  model stays in the schema; deliverables are simply not assigned a phase and no phase UI is
  shown.
- The notification inbox pages (`/staff/notifications`, `/client/notifications`) and the
  notification link/count in the top nav. `Notification` rows may still be written by existing
  actions (harmless no-op writes); nothing reads them.
- Real email delivery, object storage / file uploads, live Salesforce, version compare — already
  deferred per the README and unchanged by this cut.
- Decision authority changes: comment-only clients still cannot record decisions; this cut does
  not change who can decide.

## Files that define the cut

- **Remove:** `src/app/staff/notifications/page.tsx`, `src/app/client/notifications/page.tsx`,
  `src/app/staff/projects/[projectId]/blockers/page.tsx`,
  `src/app/client/projects/[projectId]/blockers/page.tsx`, `src/components/BlockerBoard.tsx`,
  `src/components/PhaseRail.tsx`, `src/components/NotificationList.tsx`.
- **Slim:** `src/app/staff/projects/[projectId]/page.tsx`,
  `src/app/client/projects/[projectId]/page.tsx`, `src/app/client/page.tsx`,
  `src/app/staff/companies/[companyId]/page.tsx`, `src/components/TopNav.tsx`,
  `src/app/staff/layout.tsx`, `src/app/client/layout.tsx`,
  `src/app/staff/deliverables/[deliverableId]/page.tsx`,
  `src/app/client/deliverables/[deliverableId]/page.tsx`, `src/lib/actions.ts` (drop the Blockers
  section).
- **Unchanged in spirit:** `src/components/DeliverableViewer.tsx`, `DecisionBadge.tsx`, invite /
  version / comment / decision actions in `src/lib/actions.ts`, `prisma/schema.prisma` models for
  Company/User/Project/Deliverable/Version/Comment*.
- **Seed:** `prisma/seed.ts` drops blocker and phase-assignment theater; keeps Northwind and
  Alpine, one design deliverable (2 versions, comment threads) and one prototype deliverable per
  company so the full viewer is still demoable end to end.

## Verification

Manual walkthrough in the browser covering the full loop (invite, publish, comment as
comment-only client, decide as approver) with no blocker/phase/notification surfaces reachable
from the nav.
