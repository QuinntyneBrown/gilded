# T-051: WCAG 2.1 AA automated audit in CI

**Traces to:** L2-022 (L1-015)
**Depends on:** T-006
**Est. session:** Small (~2 h)

## Objective
Wire `@axe-core/playwright` into every Playwright spec via a fixture. Any page visited during a test must be audited with zero critical or serious violations. Failing violations fail the build.

## Scope
**In:**
- Playwright fixture extending `test` with an automatic after-each axe scan on the primary route in scope.
- Keyboard focus order spec for each primary screen (signup, login, search, profile, notes, spouse settings, shortlist, admin moderation).
- Image `alt` audit: CI test that parses templates and fails if an `<img>` or `<mat-icon>` without accessible name is found.

**Out:**
- Full manual QA pass (out-of-scope for CI).

## Radical Simplicity Mandate
- One fixture, one helper. No custom reporter layer — Playwright's output is enough.

## ATDD Workflow
1. **RED.** Add audit fixture, run it — pre-existing a11y violations fail. Fix the owning templates and re-run.
2. **COMMIT:** `test(T-051): enforce axe-core audits on all Playwright specs`
3. **GREEN.** Fix templates to clear violations.
4. **COMMIT:** `feat(T-051): fix accessibility violations for WCAG AA`

## Verification Check
1. **Simpler?** Fixture is <20 lines.
2. **Complete?** Every primary screen audited; contrast + alt + focus order all pass.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-022)
1. Given any screen, when audited by axe-core, then zero critical or serious violations.
2. Given any interactive element, when navigated by keyboard, then focus order is logical and focus is visible.
3. Given any image, icon-only button, or form input, when rendered, then it has an accessible name.
4. Given any text or UI element, when rendered, then color contrast meets WCAG AA ratios.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
