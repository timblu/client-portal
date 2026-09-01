# Discovery Summary — Design & Approval Portal (`client-portal`)

**Engagement:** Design & Approval Portal — V1 MVP (design-approval loop, invite-only, pilot-gated)
**Prepared by:** zn-discovery-ingest v1.0.0 (retroactive synthesis from grill report + approved specs — no ingest of raw client-facing SOW/email occurred)
**Date:** 2026-09-01
**Status:** DRAFT-NO-SOW
**Sources processed:** 4 document(s) — see source registry below

> ⚠️ No Statement of Work was provided. This summary is based on an internal Grill Report and
> internally approved engineering specs, not a client-signed SOW or email/meeting-notes thread.
> It carries higher uncertainty and was accepted as the PRD baseline directly by the approver
> below rather than through a separate discovery sign-off.

---

## Source Registry

| # | Document | Type | Date | Authority |
|---|---|---|---|---|
| 1 | Grill Report — Design & Approval Portal Discovery (this session) | TRANSCRIPT | 2026-09-01 | MEDIUM |
| 2 | [`docs/superpowers/specs/2026-08-27-v1-design-approval-mvp.md`](../../docs/superpowers/specs/2026-08-27-v1-design-approval-mvp.md) — approved MVP scope-cut spec | BRIEF (approved internal spec) | 2026-08-27 | HIGH |
| 3 | [`README.md`](../../README.md) — current implementation description | OTHER | undated (reflects current `main`) | MEDIUM |
| 4 | [`docs/superpowers/specs/2026-08-31-members-experience-ux-design.md`](../../docs/superpowers/specs/2026-08-31-members-experience-ux-design.md) — approved members/roles UX spec | BRIEF (approved internal spec, UX only) | 2026-08-31 | MEDIUM |

---

## Project Background

`client-portal` is a private, invite-only client design-review and approval portal: staff
publish versioned designs, documents, and hosted prototypes; clients comment and record
Approve / Request changes / Reject decisions per deliverable `[src:2]` `[src:3]`. The current
build target is a scope-reduced V1 MVP — the smallest loop that gets a design to a decision —
ahead of a gated pilot launch with real (Salesforce-shaped) customers `[src:1]` `[src:2]`. The
data model is intentionally Salesforce-shaped (Company ≈ Account, client User ≈ Contact) so a
later move to a live Salesforce org does not require an object-model rewrite; live Salesforce
read/write is explicitly deferred `[src:3]`.

---

## Business Objectives

- Ship the smallest end-to-end design-approval loop as V1 MVP: publish a version, comment, record a decision — with no blockers, phase rail, or notification inbox surfaced. `[src:2]`
- Reach a pilot-ready state gated by zero known critical bugs, zero crashes in internal QA, a passed QA test plan, and an ops runbook, before onboarding any real pilot customer. `[src:1]`
- Correct and finalize the production build/runtime stack (Vite + React Router) before final QA sign-off. `[src:1]`
- Preserve a Salesforce-shaped data model so a post-launch Salesforce integration sprint does not require a schema rewrite. `[src:3]` `[src:1]`

---

## Key Stakeholders

| Name | Role | Organization | Notes |
|---|---|---|---|
| Tim Blubaugh | Engagement approver | — | Approved this Discovery Summary and the resulting PRD baseline on 2026-09-01. `[approval_record]` |
| TBD | Lead design engineer | — | Owns go/no-go launch decision; owns tech-stack documentation update. `[src:1]` |
| TBD | DevOps | — | Co-owns ops runbook and email-provider integration. `[src:1]` |
| TBD | QA | — | Owns QA test plan and zero-crash verification. `[src:1]` |
| TBD | PM / business dev | — | Owns pilot customer profile, outreach timeline, and SLA (post-stabilization). `[src:1]` |
| TBD | Salesforce admin / integration engineer | — | Owns Salesforce schema confirmation ahead of the post-launch integration sprint. `[src:1]` |
| TBD | Designer | — | Co-owns the comment-visibility matrix (Approver vs. Comment-only). `[src:1]` |

No individual stakeholder names were captured in the grill session beyond role titles; the
demo accounts in `README.md` (`sam@agency.test` staff; `alex@northwind.test`,
`casey@northwind.test`, `priya@northwind.test`, `devon@alpine.test` clients) are test fixtures,
not named business stakeholders. `[src:3]`

---

## Stated Requirements

### Functional

- [FR-001] Invite-only authentication via emailed magic link; no password auth, no SSO for MVP. `[src:1]` `[src:3]`
- [FR-002] Staff create a Company, invite members, and assign each member a role that governs decision authority. `[src:2]` `[src:4]` — **[CONFLICT]**: `[src:1]` states exactly two roles exist for MVP (Approver, Comment-only) with no admin role; `[src:4]` (approved) and the current schema/seed already implement four roles (Company Admin / Member × Reviewer / Approver). See Open Questions OQ-002.
- [FR-003] Staff create a Project, then a Deliverable with its first Version (static image, markdown, or hosted prototype URL). `[src:2]`
- [FR-004] Clients view a Deliverable in a unified viewer (file gallery, version switcher, Interact/Comment toggle for prototypes) and pin/reply on comments. `[src:2]` `[src:3]`
- [FR-005] Only users with Approver authority can record Approve / Request changes / Reject on the current version; Comment-only users cannot see or trigger these controls. `[src:2]` `[src:1]`
- [FR-006] The exact comment-visibility matrix between Approver and Comment-only roles (internal-only comments vs. feedback-only vs. all comments) is undefined and must be resolved before QA sign-off. `[src:1]`

### Non-Functional

- [NFR-001] Zero known critical bugs and zero crashes in internal QA are required before pilot onboarding; this gate cannot be waived. `[src:1]`
- [NFR-002] A QA test plan must exist, be executed, and pass before launch. `[src:1]`
- [NFR-003] An ops runbook (monitoring, escalation, rollback procedures) must exist before the go/no-go decision. `[src:1]`
- [NFR-004] Production magic-link email must be sent via a selected transactional email provider (e.g., SendGrid, Postmark, AWS SES, Resend), integrated and tested end-to-end before pilot onboarding; internal QA may continue using the existing dev-inbox pattern in the interim. `[src:1]` `[src:3]`
- [NFR-005] Production build tooling and routing must be Vite + React Router. `[src:1]` **Resolved 2026-09-01:** migrated by incremental extraction to a Vite React SPA, React Router, and same-origin Express JSON API replacing Server Actions.
- [NFR-006] The data model must remain Salesforce-shaped locally (no live Salesforce read/write in MVP) to minimize rework for the post-launch integration sprint. `[src:3]` `[src:1]`

---

## Constraints

| Type | Detail | Source |
|---|---|---|
| Timeline | Launch gate targeted for end of MVP sprint; enforced before pilot onboarding. | `[src:1]` |
| Timeline | Salesforce integration sprint targeted 2–3 sprints post-launch. | `[src:1]` |
| Timeline | Pilot customer outreach begins post-stabilization, not pre-launch (estimate: week 1 post-stabilization). | `[src:1]` |
| Technology | Production stack is Vite + React Router with an Express JSON API; the prior Next.js implementation has been removed. | `[src:1]`; C-001 resolution, 2026-09-01 |
| Technology | No production email provider selected; no SSO; no object storage; no live Salesforce — all explicitly deferred for this slice. | `[src:1]` `[src:2]` `[src:3]` |
| Scope | Notifications inbox, blockers, phase rail, dashboards, and version compare are out of scope for V1 MVP. | `[src:2]` `[src:3]` |
| Budget | Not stated in any source material. | — |

---

## Risks & Assumptions

| # | Type | Description | Source | Mitigation / Note |
|---|---|---|---|---|
| R-001 | Risk | Magic-link auth is non-functional in production with no email provider selected; blocks pilot onboarding. | `[src:1]` | Select and integrate a provider before pilot; keep dev-inbox for internal QA. |
| R-002 | Risk | Salesforce object/field API names are unconfirmed; mismatch could delay the integration sprint 2–3 weeks. | `[src:1]` | Confirm schema early in integration sprint planning. |
| R-003 | Risk | Comment-visibility rules between Approver and Comment-only are undefined; ambiguity could surface as a QA failure or a real information-disclosure issue. | `[src:1]` | Define and document the matrix before QA sign-off (FR-006). |
| R-004 | Risk (closed) | Declared production stack originally did not match the Next.js repository or earlier approved spec. | `[src:1]` vs `[src:2]` `[src:3]` + repo inspection | **Closed 2026-09-01:** incremental Vite + React Router migration completed; Express API replaces Server Actions. |
| A-001 | Assumption | Lead design engineer approval + zero crashes are sufficient for launch; pilot outreach is decoupled from MVP completion. | `[src:1]` | Revisit if pilot outreach stalls post-stabilization. |
| A-002 | Assumption | Comment-only users are assumed to see a subset of comments; exact rules TBD in QA. | `[src:1]` | Resolve alongside FR-006. |
| A-003 | Assumption | Invite-only magic-link auth is sufficient for MVP B2B clients; no SSO or password auth needed. | `[src:1]` | Validated in interview; accept as-is. |
| A-004 | Assumption | Four verified test accounts are sufficient for internal QA ahead of a production email provider being selected. | `[src:1]` | Accept for internal QA only; does not resolve NFR-004. |

---

## Open Questions

| # | Question | Raised by | Priority |
|---|---|---|---|
| OQ-001 | **RESOLVED 2026-09-01:** Vite + React Router governs; incremental extraction produced a Vite SPA and same-origin Express API replacing Next.js App Router and Server Actions. | `[src:1]` vs `[src:2]` `[src:3]`; approved by Tim Blubaugh | CLOSED |
| OQ-002 | [CONFLICT] Which role model ships in V1: the grill's two-role model (Approver / Comment-only, no admin), or the approved four-role model (Company Admin / Member × Reviewer / Approver) already reflected in `[src:4]` and the current schema/seed? | `[src:1]` vs `[src:4]` | HIGH |
| OQ-003 | Which production email provider will be used (SendGrid, Postmark, AWS SES, Resend, or other)? | `[src:1]` | HIGH |
| OQ-004 | What is the exact comment-visibility matrix for Approver vs. Comment-only roles (internal comments, feedback-only, or all comments)? | `[src:1]` | MEDIUM |
| OQ-005 | What are the actual Salesforce object API names, field API names, and record types for the post-launch integration? | `[src:1]` | MEDIUM |
| OQ-006 | Who owns pilot customer acquisition, what is the target customer profile, the outreach timeline, and the SLA before onboarding? | `[src:1]` | MEDIUM |
| OQ-007 | How will the post-launch roadmap backlog (notifications, blockers, phase rail, Salesforce sync, dashboards) be ranked, and by whom? | `[src:1]` | LOW |

---

## Recommended Next Steps

1. Resolve the role-model conflict (OQ-002) — Lead design engineer + designer — before Phase 2 is baselined.
2. Select a production email provider (OQ-003) — Lead engineer / DevOps — before final QA sign-off.
3. Define and document the comment-visibility matrix (OQ-004) — Designer + lead engineer — before QA sign-off.
4. Confirm Salesforce schema (OQ-005) — Salesforce admin / integration engineer — before integration sprint kickoff.
5. Define pilot customer profile, owner, timeline, and SLA (OQ-006) — PM / business dev — post-stabilization.
6. Rank the post-launch roadmap backlog (OQ-007) — PM / product owner — after pilot feedback cycle.

---

_Synthesized from `grill-report.md` and approved engineering specs; no separate client SOW or
email thread exists for this engagement. Review before treating as a client-facing artifact._
