# Grill Report — Design & Approval Portal (`client-portal`) — 2026-09-01

> Persisted per `zn-grill-with-docs@v1.0.0` record shape. Content below is a faithful
> restructuring of the Grill Report pasted into this session (produced by
> `zn-discovery-interview v1.0.0`); no findings were added or removed, only re-keyed into
> ID + Type + Priority + Owner + Status records so it can feed `discovery_summary.md` and
> `PRD-v1.0.md`.

## Interview Metadata

| Attribute | Value |
|---|---|
| Session Duration | 3 turns (auto-open → intake synthesis → gap interview → close) |
| Source Materials | User brain dump (Sessions 1–3) + context summary + tech stack correction (Vite + React Router) |
| Interviewer | zn-discovery-interview v1.0.0 |
| Respondent(s) | Project team (designer, lead engineer, stakeholders) |
| Discovery Summary version | None existed at grill time — `discovery_summary.md` synthesized after this grill, see companion file |
| Conducted by | AI engagement agent (this session) |
| Status | Complete — pragmatic completion bar met |

## Summary Statistics (by type, per skill record shape)

| Type | Count | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| GAP | 6 | 2 | 4 | 0 |
| ASSUMPTION | 3 | 0 | 3 | 0 |
| EDGE-CASE | 1 | 0 | 0 | 1 |
| SCOPE-ADDITION | 0 | 0 | 0 | 0 |
| CONFLICT | 2 | 2 | 0 | 0 |
| **Total** | **12** | **4** | **7** | **1** |

Original session's own statistics (preserved for fidelity to the source paste):

| Category | Count |
|---|---|
| Gaps Identified | 9 |
| Gaps Filled | 7 |
| Gaps Deferred (with acknowledgment) | 2 |
| HIGH-priority findings | 3 |
| MEDIUM-priority findings | 4 |
| Assumptions Surfaced | 4 |
| Risks Identified | 4 |
| Tech Stack Corrections | 1 (Next.js → Vite + React Router) |

The two counts differ because the original report grouped findings by priority tier only
(3 HIGH / 4 MEDIUM "findings"), while this record additionally splits each finding's embedded
risks and assumptions into their own typed records, and treats the tech-stack correction as a
`CONFLICT` (a discrepancy between the prototype's implied stack and the corrected production
requirement) rather than a bare correction note. No content was dropped.

## Findings (HIGH Priority)

### CONFLICT-001 — Tech Stack: Next.js vs. Vite + React Router
- **Source:** context-summary-correction
- **Question/Trigger:** Context summary described the prototype as Next.js; a later correction states production must be Vite + React Router.
- **Response:** Correction accepted — production build tooling and routing layer is Vite + React Router, not Next.js. Affects CI/CD, bundle strategy, hot-reload workflow.
- **Priority:** HIGH
- **Recommended Action:** Update all build, deployment, and QA docs to reflect Vite + React Router.
- **Owner Suggestion:** Lead design engineer / DevOps
- **Status:** RESOLVED (correction accepted) — **downstream conflict remains OPEN**: the current repository (`package.json`, `README.md`, and the approved `2026-08-27` MVP spec) is implemented on Next.js App Router + Server Actions, not Vite + React Router. See `discovery_summary.md` OQ-001 and `PRD-v1.0.md` Conflicts & Decisions.

### GAP-001 — Production Email Provider Not Selected
- **Source:** interview
- **Question/Trigger:** What sends the magic-link email in production?
- **Response:** No provider selected yet; magic-link auth is non-functional in production without one. Blocking pilot onboarding.
- **Priority:** HIGH
- **Recommended Action:** Select provider (SendGrid, Postmark, AWS SES, Resend, etc.); integrate; test end-to-end before pilot.
- **Owner Suggestion:** TBD (likely lead engineer or DevOps)
- **Status:** OPEN — must complete before pilot onboarding (post-stabilization)

### GAP-002 — Launch Readiness Gate: Zero-Crash Requirement + Ops Runbook
- **Source:** interview
- **Question/Trigger:** What conditions gate go/no-go for launch?
- **Response:** Lead design engineer sign-off (no known critical bugs), zero crashes in internal QA, QA test plan complete and passed, and an ops runbook (monitoring, escalation, rollback) are all required. Gates cannot be waived.
- **Priority:** HIGH
- **Recommended Action:** Lead design engineer owns go/no-go; QA + DevOps own the runbook. Target: end of MVP sprint; gate enforced before pilot onboarding.
- **Owner Suggestion:** Lead design engineer (go/no-go); QA + DevOps (runbook)
- **Status:** OPEN / IN PROGRESS

## Findings (MEDIUM Priority)

### GAP-003 — Pilot Customer Acquisition Timeline & Ownership Undefined
- **Source:** interview
- **Response:** Pilot strategy is locked to "recruit post-stabilization, not pre-launch," but timeline, target profile, owner, and SLA are all TBD.
- **Priority:** MEDIUM
- **Recommended Action:** Define target pilot customer profile; identify owner (PM, founder, business dev); set outreach timeline (week 1 post-stabilization, estimate); confirm SLA before onboarding.
- **Owner Suggestion:** TBD (likely PM or business dev)
- **Status:** DEFERRED — starts post-stabilization; must complete before pilot onboarding

### GAP-004 — Salesforce Integration Schema Unconfirmed
- **Source:** interview
- **Response:** MVP schema assumes Salesforce-shaped objects (Company, User, Design, Approval, Comment); actual Salesforce object/field API names and record types are unconfirmed. Mismatch risks a 2–3 week delay to the integration sprint.
- **Priority:** MEDIUM
- **Recommended Action:** Confirm Salesforce schema (object API names, field API names, record types) before integration sprint kickoff.
- **Owner Suggestion:** Salesforce admin / integration engineer (post-launch)
- **Status:** DEFERRED — 2–3 sprints post-launch; confirm schema early in sprint planning

### GAP-005 — Post-Launch Roadmap Backlog Not Prioritized
- **Source:** interview
- **Response:** Deferred features (notifications, blockers, phase rail, Salesforce sync, dashboards) are not ranked; roadmap is to be informed by pilot feedback.
- **Priority:** MEDIUM
- **Recommended Action:** Document feature descriptions; wait for pilot feedback; rank by impact + effort.
- **Owner Suggestion:** PM / product owner
- **Status:** DEFERRED — post-MVP launch; roadmap review after pilot feedback cycle

### GAP-006 — Role-Based Comment Visibility Granularity Undefined
- **Source:** interview
- **Response:** Comment-only role cannot see approve/reject buttons, but the exact visibility rules between roles (internal comments vs. feedback-only vs. all comments) are unclear.
- **Priority:** MEDIUM
- **Recommended Action:** Define comment visibility matrix (Approver vs. Comment-only); test in QA; document in ops runbook.
- **Owner Suggestion:** Designer / lead engineer
- **Status:** OPEN / IN PROGRESS — before QA sign-off

### ASSUMPTION-001 — Launch Gate Sufficiency Decouples Pilot from MVP Completion
- **Source:** interview (embedded in GAP-003)
- **Response:** Lead design engineer approval + zero crashes are assumed sufficient for launch; pilot outreach is decoupled from MVP completion.
- **Priority:** MEDIUM
- **Recommended Action:** Accept as-is; revisit if pilot outreach stalls post-stabilization.
- **Owner Suggestion:** PM / lead design engineer
- **Status:** ACCEPTED

### ASSUMPTION-002 — Comment-Only Users See a Subset of Comments
- **Source:** interview (embedded in GAP-006)
- **Response:** Comment-only users are assumed to see a subset of comments; exact rules are TBD in QA.
- **Priority:** MEDIUM
- **Recommended Action:** Resolve alongside GAP-006's comment visibility matrix before QA sign-off.
- **Owner Suggestion:** Designer / lead engineer
- **Status:** OPEN

### ASSUMPTION-003 — Magic-Link Auth Sufficient for B2B Clients
- **Source:** interview / edge case
- **Response:** Invite-only + email magic-link is sufficient for MVP; no SSO, no password auth. Assumption validated in interview.
- **Priority:** MEDIUM
- **Recommended Action:** Accept as-is.
- **Owner Suggestion:** Lead engineer
- **Status:** RESOLVED (validated)

## Findings (LOW Priority)

### EDGE-CASE-001 — Test Accounts Ready, Production Email Still Pending
- **Source:** interview / edge case
- **Response:** Four test accounts verified working; sufficient for internal QA. Pilot will use the production email provider (TBD, see GAP-001).
- **Priority:** LOW
- **Recommended Action:** Accept as-is for internal QA; do not treat as resolving GAP-001.
- **Owner Suggestion:** QA
- **Status:** RESOLVED (informational)

## Deferred Items

| Item | Reason | Next Trigger | Related ID |
|---|---|---|---|
| Pilot customer recruitment | Post-stabilization strategy; no pre-committed customer | Post-launch feedback cycle | GAP-003, ASSUMPTION-001 |
| Production email provider | Selection TBD in sprint planning | Before pilot onboarding | GAP-001 |
| Post-launch roadmap priorities | Feature ranking deferred to pilot feedback | After pilot feedback collected | GAP-005 |
| Salesforce integration | Full sync 2–3 sprints post-launch | Integration sprint kickoff (post-MVP) | GAP-004 |

## Recommended Next Steps (from original session)

1. **Tech stack documentation:** Update build, deployment, and QA docs to reflect Vite + React Router (not Next.js).
2. **QA test plan kickoff:** Map test scenarios to approval-loop requirements; define pass/fail criteria; target zero-crash gate.
3. **Email provider selection:** Choose service; plan integration; target completion before final QA.
4. **Ops runbook draft:** Lead engineer + DevOps to define monitoring, escalation, rollback; iterate with QA feedback.
5. **Comment visibility matrix:** Finalize Approver vs. Comment-only view rules; test in QA; document.
6. **Pilot outreach planning (post-stabilization):** Define customer profile, timeline, SLA.

## Note Added During Persistence (not part of original grill session)

While preparing `discovery_summary.md` and `PRD-v1.0.md` from this report, a second stack/role
discrepancy was found by cross-referencing the repository and prior approved specs:

- The repository (`package.json`), `README.md`, and the approved
  [`2026-08-27-v1-design-approval-mvp.md`](../../docs/superpowers/specs/2026-08-27-v1-design-approval-mvp.md)
  spec all describe **Next.js App Router + Server Actions** as the implementation, not Vite +
  React Router (see CONFLICT-001).
- This grill session states the MVP role model is exactly two roles — Approver and
  Comment-only, no admin role — but the approved
  [`2026-08-31-members-experience-ux-design.md`](../../docs/superpowers/specs/2026-08-31-members-experience-ux-design.md)
  spec (and the current seed data / schema) already implement a four-role model (Company
  Admin / Member × Reviewer / Approver). This is recorded as **CONFLICT-002** in
  `discovery_summary.md` and carried into `PRD-v1.0.md` Conflicts & Decisions, since it was not
  raised in the original grill session but materially affects scope.
