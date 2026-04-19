# T-015: Password reset Angular pages + POM

**Traces to:** L2-003 (L1-009), L2-024 (L1-016)
**Depends on:** T-006, T-012
**Est. session:** Small (~1.5 h)

## Objective
Ship two Angular routes: `/reset-request` (enter email) and `/reset-complete?token=...` (set new password). Both use only Material components. POM exposes both screens.

## Scope
**In:**
- `ResetRequestPageComponent` — posts to `/api/auth/reset-request`.
- `ResetCompletePageComponent` — reads `token` query param, posts to `/api/auth/reset-complete`.
- Generic confirmation after request (no enumeration).
- Snackbar (`MatSnackBar`) on completion success.
- POM combining both pages under `PasswordResetFlow` (per the `e2e/flows/` convention) or two separate POMs — author's choice, justified in code review.

**Out:**
- Password manager integration beyond `autocomplete="new-password"`.

## Radical Simplicity Mandate
- Two components. If most of the password field / validator logic is identical to T-013 signup, extract a single shared validator function — and nothing else. Do not create a "password field" component.

## Page Object(s)
- `ResetRequestPage` in `e2e/pages/reset-request.page.ts`.
- `ResetCompletePage` in `e2e/pages/reset-complete.page.ts`.

## ATDD Workflow
1. **RED.** Playwright specs: request flow always shows confirmation regardless of email; complete flow with valid token sets password and redirects to `/login`; expired token renders a clear error.
2. **COMMIT:** `test(T-015): add failing reset page POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-015): add password reset pages`

## Verification Check
1. **Simpler?** Did the shared validator actually earn its existence, or is it only used in one place? If one, inline.
2. **Complete?** Covers all three L2-003 ACs end-to-end.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-003, L2-024)
- Both pages use only Material components.
- Request never reveals whether the email exists.
- Complete consumes the token single-use; reuse shows error.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
