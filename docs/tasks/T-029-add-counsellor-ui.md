# T-029: Add Counsellor Angular form + POM

**Traces to:** L2-008 (L1-004), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-027
**Est. session:** Small (~2 h)

## Objective
Ship `/counsellors/new`: Material-only form covering all required fields. On success, show a `MatSnackBar` confirmation and redirect to a "pending review" message. On duplicate (409), show a `MatDialog` linking to the existing profile.

## Scope
**In:**
- `AddCounsellorPageComponent` with sections: Identity, Contact, Faith, Specialties, Address.
- All inputs use `MatFormField`, phone uses `type="tel"` (per L2-017 AC3).
- Postal code input uses the validator from T-020.
- `AddCounsellorPage` POM.

**Out:**
- Photo upload on submission (T-024 covers photo upload separately on existing counsellors).

## Radical Simplicity Mandate
- One reactive form. One onSubmit method. No form-step abstraction.
- No shared "counsellor form component" between this page and any admin edit screen — build it again when the second screen actually exists.

## Page Object(s)
- `AddCounsellorPage` in `e2e/pages/add-counsellor.page.ts`:
  - `fill(fields: CounsellorInput)`
  - `submit()`
  - `expectPendingReviewMessage()`
  - `expectDuplicateDialogLinksToExistingProfile()`

## ATDD Workflow
1. **RED.** Playwright specs: valid submission → pending-review screen; 409 path shows dialog with link; mobile keyboard type correct on phone input.
2. **COMMIT:** `test(T-029): add failing add-counsellor POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-029): add add-counsellor page`

## Verification Check
1. **Simpler?** Any field validated in two places? Keep server authoritative.
2. **Complete?** All paths end-to-end.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-008, L2-024, L2-017)
- Form uses only Material components.
- Phone input uses mobile keyboard type `tel`.
- Duplicate submission surfaces existing counsellor via dialog link.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
