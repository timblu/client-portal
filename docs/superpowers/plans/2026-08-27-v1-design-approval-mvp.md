# V1 Design-Approval MVP Implementation Plan

> **Status:** Executed directly in the same session as the spec, per explicit instruction to
> implement without stopping for the usual spec-review gate. This document records what was
> built against the spec at
> [`docs/superpowers/specs/2026-08-27-v1-design-approval-mvp.md`](../specs/2026-08-27-v1-design-approval-mvp.md)
> rather than serving as a forward-looking task list.

**Goal:** Cut the review-portal slice down to the smallest design-approval loop: staff publishes
a version, the client comments, an approver decides.

**Architecture:** No schema migration. Remove UI routes/components for blockers, the global phase
rail, and the notification inbox; slim the pages that referenced them; leave the underlying
Prisma models (`Blocker`, `BlockerComment`, `Phase`, `Notification`) in place but unused by any
page or seed data.

**Tech Stack:** Next.js App Router, Server Actions, Prisma + SQLite (unchanged).

## Global Constraints

- No schema migration — `prisma/schema.prisma` is unchanged.
- No new features: no production email, uploads, Salesforce, or version compare.
- Monochrome visual system unchanged.
- Comment-only clients must not be able to see or trigger decision controls.

---

## Task 1: Remove blocker surfaces

**Files:**
- Delete: `src/app/staff/projects/[projectId]/blockers/page.tsx`,
  `src/app/client/projects/[projectId]/blockers/page.tsx`, `src/components/BlockerBoard.tsx`
- Modify: `src/lib/actions.ts` (drop `createBlocker`, `updateBlockerStatus`,
  `addBlockerComment`), `src/app/staff/projects/[projectId]/page.tsx`,
  `src/app/client/projects/[projectId]/page.tsx`, `src/app/staff/companies/[companyId]/page.tsx`,
  `src/app/client/page.tsx` (drop the Blockers link, `blockers` Prisma includes, and open-blocker
  counts)

- [x] Delete the blocker pages and `BlockerBoard` component.
- [x] Remove the three blocker actions from `src/lib/actions.ts`.
- [x] Remove the "Blockers" link and `blockers` query include from both project pages.
- [x] Remove the open-blocker count text from the staff company page and the `blockers` include
      from the client home page.
- [x] Verified: `/staff/projects/:id/blockers` and `/client/projects/:id/blockers` return 404.

## Task 2: Remove the global phase rail

**Files:**
- Delete: `src/components/PhaseRail.tsx`
- Modify: `src/app/staff/projects/[projectId]/page.tsx` (drop `PhaseRail`, the `Phase` select in
  the new-deliverable form, and the phase query), `src/app/client/projects/[projectId]/page.tsx`
  (drop `PhaseRail` and phase text), `src/app/staff/deliverables/[deliverableId]/page.tsx` and
  `src/app/client/deliverables/[deliverableId]/page.tsx` (drop `phase: true` include),
  `src/components/DeliverableViewer.tsx` (drop the now-always-null `phaseName` prop and its
  render)

- [x] Delete `PhaseRail.tsx` and remove its usage from both project pages.
- [x] Remove the Phase `<select>` from the staff "New deliverable" form.
- [x] Remove `d.phase?.name` text from deliverable list rows on both project pages.
- [x] Remove the `phaseName` prop from `DeliverableViewer` and its two callers, since nothing
      assigns a phase anymore and a permanent "No phase" label would be worse than no label.
- [x] Verified: deliverable list rows show `<type> · v<n>` with no phase segment; toolbar in the
      viewer shows just the title.

## Task 3: Remove the notification inbox

**Files:**
- Delete: `src/app/staff/notifications/page.tsx`, `src/app/client/notifications/page.tsx`,
  `src/components/NotificationList.tsx`
- Modify: `src/components/TopNav.tsx` (drop `notificationsHref`/`notificationCount` props),
  `src/app/staff/layout.tsx`, `src/app/client/layout.tsx` (drop the `db.notification.count`
  query and the props passed to `TopNav`)

- [x] Delete the two notification pages and `NotificationList`.
- [x] Remove notification props from `TopNav` and both layouts.
- [x] Leave `src/lib/notifications.ts` (`notify`, `notifyCompany`, `notifyAllStaff`) and their
      call sites in `src/lib/actions.ts` untouched — writes become harmless no-ops with nothing
      reading the `Notification` table.
- [x] Verified: `/staff/notifications` and `/client/notifications` return 404; no "Notifications"
      link in the top nav for either role.

## Task 4: Update seed data and root metadata

**Files:**
- Modify: `prisma/seed.ts` (drop `Phase` creation/assignment and all `Blocker`/`BlockerComment`
  creation, keep two companies each with one design deliverable — 2 versions with comment
  threads — and one prototype deliverable), `src/app/layout.tsx` (drop "blockers" from the page
  description)

- [x] Rewrite `prisma/seed.ts` without phase or blocker theater.
- [x] Update the root layout's metadata description.
- [x] Ran `npm run db:seed` — completes cleanly, prints the same three demo accounts.

## Verification

No browser automation tool was available in this session. Verified instead via `curl` against
the running dev server (`localhost:3000`) using real sessions established by minting magic-link
tokens directly in the SQLite dev database (bypassing only the outer "request a link" step,
which is itself a UI convenience over the same `MagicLink` table):

- **Read path:** confirmed for staff (Sam), approver client (Casey), comment-only client (Priya),
  and second-company approver (Devon) — company list, company detail, project detail, and all
  three deliverable kinds (static image, markdown, hosted prototype) render with no runtime
  errors, and `/staff/notifications`, `/client/notifications`, and both `/blockers` routes 404.
- **Decision authority:** Casey (approver) sees Request changes / Reject / Approve; Priya
  (comment-only) sees none of them — unchanged from before the cut.
- **Write path:** exercised `inviteMember` and `createDeliverable` (which also creates the first
  `Version`) through Next.js's progressive-enhancement form encoding (plain multipart POST with
  the `$ACTION_ID_*` hidden field Next.js renders for every form action) — both succeeded,
  redirected correctly, and the new records rendered on reload.
- **Not exercised via curl:** `addThread`, `addReply`, `toggleThreadPinned/Resolved`, and
  `submitDecision` are invoked as bound server references from client components (not plain
  forms), which requires React Flight's request encoding rather than a standard multipart POST.
  None of these functions were modified by this cut — only the unrelated blocker actions were
  deleted from the same file — so risk is low, but a real click-through in a browser is the
  remaining gap.
- Database reseeded to clean demo state after verification; all temporary tokens/cookies/test
  records were discarded.
