# T-036: Comparison view UI + POM

**Traces to:** L2-011 AC2 (L1-006), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-035
**Est. session:** Small (~2 h)

## Objective
Ship `/shortlist`: side-by-side comparison of shortlisted counsellors across rating, distance, denomination, specialties, price/insurance. Desktop = grid; narrow viewports = stacked cards with a selector chip for which two to compare.

## Scope
**In:**
- `ShortlistPageComponent`: `MatTable` horizontal at >= 992 px, `MatCard` stacked at < 992 px with a `MatButtonToggleGroup` for candidate selection.
- Mark-chosen affordance per row (`MatButton`) wired to T-037.
- POM: `ShortlistPage`.

**Out:**
- Price/insurance editing (out of scope; data source = counsellor profile fields).

## Radical Simplicity Mandate
- Two templates via `@if (isDesktop)` — not two separate components — each small.
- No view-model class.

## Page Object(s)
- `ShortlistPage` in `e2e/pages/shortlist.page.ts`:
  - `items(): Promise<string[]>`
  - `chooseAt(index)`
  - `removeAt(index)`

## ATDD Workflow
1. **RED.** Playwright specs: seeded couple with 3 shortlist items → desktop shows three columns; mobile shows stacked cards; choose flips the `Chosen` state.
2. **COMMIT:** `test(T-036): add failing comparison view POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-036): add comparison view UI`

## Verification Check
1. **Simpler?** Any duplicated markup between desktop/mobile that could use a shared ng-template?
2. **Complete?** Responsive behavior verified at 360, 768, 992, 1280.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-011 AC2)
1. Given a couple has 2+ shortlisted counsellors, when the user opens the comparison view, then a side-by-side grid displays rating, distance, denomination, specialties, and price/insurance.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
