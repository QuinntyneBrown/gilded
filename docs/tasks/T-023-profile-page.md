# T-023: Counsellor profile page + POM

**Traces to:** L2-006 (L1-002, L1-003), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-019
**Est. session:** Small (~2 h)

## Objective
Ship `/counsellors/:id`: full profile card, photo (or placeholder), rating, denomination, credentials, specialties, contact/booking section, Shortlist/Chosen controls. Material-only.

## Scope
**In:**
- `CounsellorProfilePageComponent` built from `MatCard`, `MatChipSet`, `MatIcon`, `MatButton`, `MatDivider`.
- Booking link renders via `MatButton` with `href` + `rel="noopener noreferrer"` + `target="_blank"`.
- Review/comment section placeholder renders a `MatCard` with "No reviews yet" when empty (reviews UI comes in T-034; the structural container is here).
- Responsive: single column < 576 px; two-column at >= 992 px.

**Out:**
- Actual review rendering (T-034).
- Shortlist/Chosen wiring (T-035, T-037).

## Radical Simplicity Mandate
- One component. No child sub-components until the template passes ~140 lines.
- No `ViewModel` class intermediating the counsellor resource — bind the response directly.

## Page Object(s)
- `CounsellorProfilePage` in `e2e/pages/counsellor-profile.page.ts`:
  - `goto(id)`
  - `expectName(name)`
  - `expectDenomination(text)`
  - `expectSpecialties(list: string[])`
  - `clickBookingLink()` (asserts `rel="noopener noreferrer"`)
  - `shortlist()`

## ATDD Workflow
1. **RED.** Playwright specs: visiting a known id renders all L2-006 AC1 fields; rating shows "No reviews yet" for zero-rated counsellor; booking link opens a new tab with correct rel.
2. **COMMIT:** `test(T-023): add failing profile page POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-023): add counsellor profile page`

## Verification Check
1. **Simpler?** Any data transformation that could happen in the template via pipes?
2. **Complete?** All listed fields visible.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-006, L2-024)
- Profile renders all listed fields via Material components only.
- Responsive at all five breakpoints.
- Zero-review state shows "No reviews yet".

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
