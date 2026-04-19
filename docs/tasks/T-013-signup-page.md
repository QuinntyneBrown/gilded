# T-013: Signup Angular page + POM

**Traces to:** L2-001 (L1-009), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-007
**Est. session:** Small (~2 h)

## Objective
Ship `/signup` in Angular using only Material components. On submit, call `POST /api/auth/signup` and show a "check your email" confirmation (same generic message for new or duplicate email). Ship a `SignupPage` POM.

## Scope
**In:**
- Standalone `SignupPageComponent` using `MatFormField`, `MatInput`, `MatButton`, `MatError`, `MatHint`, `MatIcon`.
- Reactive form with synchronous validators matching the backend password policy.
- Submission in progress state (`MatProgressSpinner`).
- Responsive at all five breakpoints (single column < 576 px, centered card at >=768 px).
- `SignupPage` POM with `fillEmail(email)`, `fillPassword(pwd)`, `submit()`, `expectConfirmation()`.

**Out:**
- Social auth (not required by any L2).

## Radical Simplicity Mandate
- One component. One template. One SCSS file (may be empty if theme handles everything).
- Reactive form rather than template-driven — one less branching mechanism.
- No form-builder factory helpers. Use `FormGroup` directly.

## Page Object(s)
- `SignupPage` in `e2e/pages/signup.page.ts`:
  - `fillEmail(email: string)`
  - `fillPassword(pwd: string)`
  - `submit()`
  - `expectConfirmation()`
  - `expectPasswordPolicyHint()`

## ATDD Workflow
1. **RED.** Playwright spec: visit `/signup`, fill valid fields via POM, assert confirmation text appears; second spec: weak password → inline error via `MatError`; third spec: viewport 360 px shows single-column layout (CDK breakpoint).
2. **COMMIT:** `test(T-013): add failing signup page POM specs`
3. **GREEN.** Author component + POM.
4. **COMMIT:** `feat(T-013): add signup page`

## Verification Check
1. **Simpler?** Any `*ngIf` that never fires? Any validator that duplicates the backend response path?
2. **Complete?** ACs 1-3 of L2-001 visible end-to-end via the POM.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity lint green?**

## Acceptance Criteria (from L2-001, L2-024, L2-017)
- Form fields are all `MatFormField` + `MatInput`; submit is `<button mat-raised-button>`.
- Error + hint use `MatError` + `MatHint`.
- Viewport < 576 px: single column, tap targets >= 44x44 px.
- Submitting a valid email + password renders the generic confirmation.

## Done When
- [x] Acceptance tests green on all three browsers.
- [x] Verification check answered.
- [x] Two commits recorded.
- [x] POM exposes only domain-level methods.
