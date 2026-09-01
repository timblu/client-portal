# PRD-v1.0.md — Design & Approval Portal (`client-portal`)
**Project Code:** CLIENT-PORTAL | **Version:** v1.0 | **Approved by:** Tim Blubaugh | **Date:** 2026-09-01

> **Baseline note:** `discovery_summary.md` is status `DRAFT-NO-SOW` — no client-signed SOW or
> email/meeting-notes thread exists for this engagement. Tim Blubaugh approved the Grill
> Report + Discovery Summary directly as the PRD baseline on 2026-09-01, in place of a separate
> formal discovery sign-off. Treat scope confidence accordingly (see Scope Boundaries banner).

---

## Version History

| Version | Summary | Author | Date |
|---|---|---|---|
| v1.0 | Initial PRD generated from approved Discovery Summary | Tim Blubaugh | 2026-09-01 |

---

## Functional Requirements

| ID | Description | Source | Priority | Acceptance Criteria |
|---|---|---|---|---|
| FR-001 | The system shall authenticate users exclusively via an invite-only, emailed magic link, with no password or SSO option. | Discovery FR-001 (Stated Requirements) | Must | • A user with no active invite cannot request a link • A valid link signs the user in without a password prompt • Link expiry/single-use behavior is verified in QA |
| FR-002 | The system shall let Staff create a Company, invite members, and assign each member a role that governs decision authority on deliverables. | Discovery FR-002 | [CONFLICT — see §Conflicts & Decisions] | • Staff can invite a member with a role selection • The assigned role determines whether decision controls are visible to that member • Role assignment is visible on the member's profile/detail view |
| FR-003 | The system shall let Staff create a Project, then a Deliverable with its first Version as a static image, markdown document, or hosted prototype URL. | Discovery FR-003 | Must | • Staff can create a Project under a Company • Staff can add a Deliverable with an initial Version of any of the three supported kinds • The Deliverable appears in the client's deliverable list immediately |
| FR-004 | The system shall let clients view a Deliverable in a unified viewer — file gallery, version switcher, and an Interact/Comment toggle for prototype versions — and pin/reply on comments. | Discovery FR-004 | Must | • The viewer renders all three version kinds without a separate page per kind • A client can pin a comment to a specific point/version and reply to an existing thread • Comments persist and are visible on reload |
| FR-005 | The system shall restrict Approve / Request changes / Reject controls to users with Approver authority on the current version; Comment-only users must not see or be able to trigger these controls. | Discovery FR-005 | Must | • A Comment-only user's viewer renders no decision controls, not merely disabled ones • An Approver's viewer renders all three decision actions • Attempting the decision mutation directly (bypassing the UI) as a Comment-only user is rejected server-side |
| FR-006 | The system shall define, document, and enforce a comment-visibility matrix distinguishing what Approver vs. Comment-only roles can see (internal-only comments, feedback-only comments, or all comments). | Discovery FR-006 | Must | • A written visibility matrix exists and is referenced by QA test cases • Comment-only users see exactly the comment subset the matrix defines, verified for every comment type in the schema • Ops runbook cites this matrix <br>⚠️ NEEDS CLARIFICATION: The matrix itself does not exist yet — discovery only establishes that Comment-only users see a subset of comments, not which subset. This FR cannot be marked test-ready until the matrix is authored (Discovery OQ-004). |

---

## Non-Functional Requirements

| ID | Description | Source | Acceptance Criteria |
|---|---|---|---|
| NFR-001 | The system shall exhibit zero known critical bugs and zero crashes during internal QA prior to pilot onboarding; this gate cannot be waived. | Discovery NFR-001, Risks R-001–R-004 | • QA sign-off log shows zero open critical-severity defects • No unhandled exception/crash observed across the full approval-loop test pass • Lead design engineer records explicit go/no-go |
| NFR-002 | A QA test plan mapped to the approval-loop requirements shall exist, be executed, and pass before launch. | Discovery NFR-002 | • Test plan document exists and is linked from this PRD before Phase 3 planning • Each FR above has at least one linked test case • Pass/fail criteria are recorded per test case, not just a single overall pass/fail |
| NFR-003 | An ops runbook covering monitoring, escalation, and rollback procedures shall exist and be reviewed before the go/no-go decision. | Discovery NFR-003 | • Runbook document exists with named monitoring, escalation, and rollback sections • Escalation section names an on-call owner or rotation • Rollback procedure has been dry-run at least once before pilot |
| NFR-004 | Production magic-link email shall be sent via a selected transactional email provider, integrated and tested end-to-end, before any pilot customer is onboarded; internal QA may continue using the existing dev-inbox pattern until then. | Discovery NFR-004, Risk R-001 | • A named provider is integrated in a non-production environment and verified to deliver • End-to-end send-to-click-to-session flow is tested with a real inbox • Dev-inbox fallback is removed or gated out of any pilot-facing build <br>⚠️ NEEDS CLARIFICATION: No provider is selected (Discovery OQ-003: SendGrid, Postmark, AWS SES, Resend, or other). Acceptance criteria above assume standard transactional-email delivery but cannot be finalized against a specific provider's API/quota constraints until one is chosen. |
| NFR-005 | Production build tooling and client-side routing shall be Vite + React Router. | Discovery NFR-005, Risk R-004 | • The deployed production build is produced by Vite, not the Next.js build pipeline • Client-side routes are resolved by React Router, not the Next.js App Router • CI/CD, hot-reload, and QA documentation are updated to match. **Resolved 2026-09-01:** incremental extraction to a Vite React SPA with React Router and a same-origin Express JSON API replacing Server Actions. |
| NFR-006 | The underlying data model shall remain Salesforce-shaped (Company ≈ Account, client User ≈ Contact, plus Deliverable/Version/Comment/Approval-equivalent objects) and persist outside live Salesforce for MVP. | Discovery NFR-006 | • Schema review confirms object naming mirrors the intended Salesforce shape • No live Salesforce read/write occurs in the MVP build • A written mapping from local objects to intended Salesforce objects exists ahead of the post-launch integration sprint |

---

## User Stories

| ID | Story | Linked FRs |
|---|---|---|
| US-001 | As a **Staff** user, I want to invite a company member and assign their role so that I control who can record a decision on a deliverable. | FR-002 |
| US-002 | As a **Staff** user, I want to publish a new deliverable version so that clients can review and respond to the latest design. | FR-003 |
| US-003 | As an **Approver**, I want to record Approve / Request changes / Reject on the current version so that the team has an unambiguous decision without leaving the portal. | FR-005 |
| US-004 | As a **Comment-only** reviewer, I want to pin and reply to comments on a deliverable so that I can give feedback without decision authority, and without seeing controls that don't apply to me. | FR-004, FR-005, FR-006 |
| US-005 | As the **lead design engineer**, I want zero known crashes in internal QA and a reviewed ops runbook so that I can give an informed go/no-go decision before pilot. | NFR-001, NFR-002, NFR-003 |
| US-006 | *(Conflict-dependent)* As a **Company Admin**, I want automatic Approver access on every current and future project in my company so that I don't need to be re-invited per project. | FR-002 — **[CONFLICT]**: this story reflects the four-role model in the approved members UX spec; the grill session states MVP has no admin role. Do not build until §Conflicts & Decisions C-002 is resolved. |

---

## Scope Boundaries

> ⚠ **SOW NOT EXECUTED** — Scope boundaries carry reduced confidence. The items listed as In
> Scope reflect current discovery intent and are subject to change once a formal SOW-equivalent
> sign-off is executed. Treat all scope boundaries as provisional.

### In Scope

- Invite-only magic-link authentication (no SSO, no password auth) — FR-001.
- Staff company/member/project/deliverable/version management — FR-002, FR-003.
- Client deliverable viewer (file gallery, version switcher, prototype Interact/Comment toggle) and pinned/threaded comments — FR-004.
- Approver-only decision flow (Approve / Request changes / Reject) with Comment-only controls hidden, not merely disabled — FR-005.
- A documented, QA-enforced comment-visibility matrix — FR-006.
- Migration of production build/runtime to Vite + React Router — NFR-005.
- Launch readiness gate: zero-crash internal QA, QA test plan, ops runbook, lead-engineer go/no-go — NFR-001–NFR-003.
- Salesforce-shaped local data model (no live Salesforce) — NFR-006.

### Out of Scope

- **OQ-002 (Unresolved) [CONFLICT]:** The four-role Company Admin / Member × Reviewer / Approver model (FR-002's linked user story US-006) is out of scope for v1.0 build unless Conflicts & Decisions C-002 resolves it in.
- **OQ-003 (Unresolved):** Selecting a specific production email provider — out of scope for this PRD; required before pilot onboarding, not before internal QA sign-off.
- **OQ-005 (Unresolved):** Live Salesforce integration (object/field API names, record types) — explicitly deferred 2–3 sprints post-launch.
- **OQ-006 (Unresolved):** Pilot customer acquisition (profile, owner, timeline, SLA) — deferred to post-stabilization; not part of MVP build scope.
- **OQ-007 (Unresolved):** Post-launch roadmap prioritization (notifications inbox, blockers, phase rail, dashboards, version compare) — deferred to after pilot feedback; not part of MVP build scope.
- Object storage / real file uploads — out of scope; current pasted-URL/path approach continues.
- Real-time collaboration or presence features — not raised in any source; out of scope.

---

## Solution Approach

The V1 MVP is a design-approval workflow application with a Salesforce-shaped data model
(Company ≈ Account, client User ≈ Contact, plus Project/Deliverable/Version/Comment/Approval
objects) persisted outside Salesforce for this slice; live Salesforce read/write is deferred to
a post-launch integration sprint. The core loop — Staff publish a Version, clients comment via
a unified viewer, an Approver records a decision — is unchanged from the existing implementation
and is not being redesigned, only re-platformed and gated for pilot readiness. The declared
production stack is a Vite React SPA with React Router, replacing the former Next.js App Router.
The migration uses incremental extraction rather than a greenfield rewrite: a same-origin
Express JSON API now owns cookie sessions, Prisma queries, authorization, and the mutations
formerly implemented as Server Actions. Vite proxies `/api` and `/auth` to Express in
development; Express serves the production `dist` bundle and client-route fallback. No Zinc-style
solution accelerators apply to this engagement. The unresolved role-model conflict (C-002)
remains the primary scope risk before further feature planning.

> ⚠️ This PRD contains 3 section(s) flagged `NEEDS CLARIFICATION`. Review and resolve before approving.

---

## Conflicts & Decisions

| ID | Conflict Description | Resolution | Resolved By | Date |
|---|---|---|---|---|
| C-001 | Production stack: the grill correction requires Vite + React Router; the repository, `README.md`, and the approved `2026-08-27` MVP spec described Next.js App Router + Server Actions. | **Resolved:** Vite React SPA + React Router with a same-origin Express JSON API; incremental extraction preserves the Prisma/SQLite model and existing UI. | Tim Blubaugh | 2026-09-01 |
| C-002 | Role model: the grill session states MVP ships exactly two roles (Approver, Comment-only) with no admin role, deferring administration to post-launch. The approved `2026-08-31` members UX spec — and the current schema/seed data — already implement a four-role model (Company Admin / Member × Reviewer / Approver). FR-002 and US-006 are written to flag this but not resolve it. | | | |

---

## Deferred Requests

*(none identified — no stakeholder communication outside the approved Discovery Summary sources was available to introduce net-new scope requests during PRD drafting)*

---

## SOW Open Questions

The following must be resolved before this PRD can be treated as a baselined, SOW-equivalent
requirements document rather than a provisional one:

1. **OQ-002 / C-002** — Does v1.0 ship the two-role model (Approver / Comment-only) or the four-role model (Company Admin / Member × Reviewer / Approver) already reflected in the approved UX spec and current schema?
2. **OQ-003** — Which production transactional email provider will be integrated (SendGrid, Postmark, AWS SES, Resend, or other)?
3. **OQ-004** — What is the exact comment-visibility matrix for Approver vs. Comment-only roles?
4. **OQ-005** — What are the real Salesforce object API names, field API names, and record types for the post-launch integration sprint?
5. **OQ-006** — Who owns pilot customer acquisition, and what is the target profile, outreach timeline, and SLA?
6. **OQ-007** — How and by whom will the post-launch roadmap backlog be ranked?
