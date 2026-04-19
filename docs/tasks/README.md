# Implementation Task Plan — Gilded

This directory contains a vertically-sliced ATDD task list that implements every requirement in `docs/specs/L1.md` and `docs/specs/L2.md`.

Each task is a single Markdown file in this directory. Tasks are small enough to complete in one focused session (typ. 1-3 hours) and follow the same template:

- **Radical simplicity** — the stated goal of every task. Lowest complexity score achievable. No premature abstractions. No unused helpers. Three similar lines beat a premature generalization.
- **ATDD** — write failing acceptance tests first, commit, implement the minimum needed to pass, commit again.
- **Playwright e2e with Page Object Model** — every UI-facing task ships a Playwright e2e spec and a Page Object class under `e2e/pages/`. Specs never touch selectors or raw page APIs — they go through the POM only. Backend-only tasks use API-level Playwright tests with the same test runner.
- **Verification check** — after implementation, re-read the diff and answer the checklist: can this be simpler? is it complete? any stubs, mocks, TODOs, or temporary code in production? Simplify and re-commit if the answer is yes to #1.
- **No stubs/mocks/placeholders in production code.** Mocks live only under `**/tests/**` or `**/spec/**`.

## Required commit cadence per task

1. `test(T-XXX): add failing acceptance tests for L2-XXX` — **RED** (unit + Playwright POM e2e).
2. `feat(T-XXX): implement L2-XXX` — **GREEN**.
3. (optional) `refactor(T-XXX): simplify` — after the verification check if simplification is possible.

Every acceptance test file must begin with:

```ts
// Acceptance Test
// Traces to: L2-XXX
// Description: <short sentence>
```

## End-to-end test conventions (Playwright POM)

- Test runner: `@playwright/test`.
- Directory layout:
  ```
  e2e/
    pages/            // Page Object classes — one per screen
    flows/            // higher-level flow helpers that compose POMs
    fixtures/         // Playwright fixtures (auth, seeded data)
    specs/            // *.spec.ts — the actual tests; import POMs only
  ```
- A POM exposes domain-level methods (`signIn(email, password)`, `rateCounsellor(1..5)`, `openNotesTab('spouse')`), never raw locators on the public surface.
- Locators inside a POM must prefer Material-aware roles/semantics (`getByRole('button', { name: 'Sign in' })`) over CSS selectors. Test IDs (`data-testid`) are reserved for when role/name cannot uniquely identify an element.
- Specs follow Arrange-Act-Assert with one logical assertion per test.
- Each UI-facing task lists the specific POM class(es) it introduces or extends.

## Phases

### Phase 0 — Foundation
- [T-001](./T-001-project-scaffolding.md) — Angular + backend scaffolding
- [T-002](./T-002-material-theme.md) — Material 3 theme, typography, density tokens
- [T-003](./T-003-app-shell.md) — App shell with `MatToolbar` + `MatSidenav`
- [T-004](./T-004-responsive-layout.md) — `BreakpointObserver`-driven responsive primitives
- [T-005](./T-005-material-exclusivity-ci.md) — CI lint rules that enforce Material-only UI
- [T-006](./T-006-playwright-pom-foundation.md) — Playwright e2e foundation + POM base class

### Phase 1 — Authentication
- [T-007](./T-007-signup-endpoint.md) — Signup endpoint (pending_verification state)
- [T-008](./T-008-email-verification.md) — Email verification flow
- [T-009](./T-009-login-session.md) — Login + HTTP-only session cookie
- [T-010](./T-010-login-rate-limit.md) — Login rate limiting and 429 lockout
- [T-011](./T-011-logout.md) — Logout invalidates session server-side
- [T-012](./T-012-password-reset.md) — Password reset (request + complete)
- [T-013](./T-013-signup-page.md) — Signup Angular page + POM
- [T-014](./T-014-login-page.md) — Login Angular page + POM
- [T-015](./T-015-password-reset-pages.md) — Password reset Angular pages + POM

### Phase 2 — Couples
- [T-016](./T-016-spouse-invite.md) — Spouse invitation (send + accept)
- [T-017](./T-017-spouse-unlink.md) — Spouse unlink and cascade rules
- [T-018](./T-018-spouse-ui.md) — Spouse management UI + POM

### Phase 3 — Counsellor Directory
- [T-019](./T-019-counsellor-entity.md) — Counsellor entity + read API
- [T-020](./T-020-postal-geocoding.md) — Postal code geocoding + cache
- [T-021](./T-021-proximity-search.md) — Proximity search endpoint
- [T-022](./T-022-search-page.md) — Counsellor search page + POM
- [T-023](./T-023-profile-page.md) — Counsellor profile page + POM
- [T-024](./T-024-counsellor-photo.md) — Photo upload + placeholder fallback
- [T-025](./T-025-seed-counsellors.md) — Seed counsellors from `christian_counsellors_L5A_4E6.md`

### Phase 4 — Ingestion & Manual Submission
- [T-026](./T-026-web-ingestion.md) — Web research ingestion job
- [T-027](./T-027-manual-submission.md) — Manual counsellor submission + dedupe
- [T-028](./T-028-moderation-queue.md) — Moderation queue (approve / reject)
- [T-029](./T-029-add-counsellor-ui.md) — Add Counsellor Angular form + POM

### Phase 5 — Ratings & Reviews
- [T-030](./T-030-rating-endpoint.md) — Rating endpoint + aggregate projection
- [T-031](./T-031-review-endpoint.md) — Review endpoint
- [T-032](./T-032-comment-endpoint.md) — Comment endpoint
- [T-033](./T-033-moderation-ruleset.md) — Shared moderation ruleset service
- [T-034](./T-034-rating-review-ui.md) — Rating / review / comment UI + POM

### Phase 6 — Shortlist & Appointment
- [T-035](./T-035-shortlist-api.md) — Shortlist API (couple-scoped)
- [T-036](./T-036-comparison-view.md) — Comparison view UI + POM
- [T-037](./T-037-chosen-counsellor.md) — Chosen counsellor + spouse notification
- [T-038](./T-038-appointment-intent.md) — Appointment intent + reminder banner

### Phase 7 — Notes
- [T-039](./T-039-note-entity-encryption.md) — Note entity + encryption-at-rest
- [T-040](./T-040-private-notes.md) — Private notes CRUD
- [T-041](./T-041-spouse-notes.md) — Spouse-shared notes CRUD
- [T-042](./T-042-public-notes.md) — Public notes CRUD
- [T-043](./T-043-idor-tests.md) — IDOR test suite for notes
- [T-044](./T-044-notes-ui.md) — Notes UI with three-visibility tabs + POM

### Phase 8 — Cross-cutting & Ops
- [T-045](./T-045-global-rate-limit.md) — Global rate limiting (auth / reset / invite)
- [T-046](./T-046-user-action-rate-limit.md) — Per-user rate limiting on reviews / notes
- [T-047](./T-047-captcha.md) — CAPTCHA on signup + review creation
- [T-048](./T-048-validation-layer.md) — Server-side input validation layer
- [T-049](./T-049-structured-logging.md) — Structured logging with redaction
- [T-050](./T-050-metrics.md) — Metrics endpoint
- [T-051](./T-051-accessibility-ci.md) — WCAG 2.1 AA automated audit in CI
- [T-052](./T-052-account-deletion.md) — Account and data deletion
- [T-053](./T-053-performance-budget.md) — Performance budget and LCP check in CI
- [T-054](./T-054-e2e-golden-journeys.md) — End-to-end golden journey Playwright specs

## Task template

Every task document contains the same sections:

1. **Objective** — one paragraph, end-to-end.
2. **Traces to** — the specific L2 requirement(s).
3. **Depends on** — prerequisite tasks.
4. **Scope — In / Out** — exact bounds.
5. **Radical Simplicity Mandate** — the simplest implementation that satisfies the criteria; no speculative abstractions, no dead code.
6. **ATDD Workflow** — RED (unit + POM e2e) → commit → GREEN → commit → verify.
7. **Page Object(s)** — for UI-facing tasks only: the POM class(es) added or extended and their public method surface.
8. **Verification Check** — the post-implementation questions the author must answer in writing.
9. **Acceptance Criteria** — copied verbatim from L2.md so the task is self-contained.
10. **Done When** — binary close-out checklist.
