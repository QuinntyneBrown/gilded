# T-022: Counsellor search page + POM

**Traces to:** L2-005 (L1-002), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-021
**Est. session:** Small (~2 h)

## Objective
Ship `/search`: postal code input, radius chooser, results list with distance, rating, photo (or placeholder), shortlist affordance. Material-only. POM exposes search and result interactions.

## Scope
**In:**
- `SearchPageComponent` with `MatFormField`, `MatInput`, `MatSelect` for radius, `MatPaginator` for pagination.
- Result item as `MatCard` or `MatListItem` with a thumbnail, name, distance, rating (`MatIcon` star + numeric), denomination chips (`MatChipSet`), Shortlist `MatButton`.
- Empty state via `<mat-card>` with copy "No counsellors match".
- `SearchPage` POM.

**Out:**
- Shortlist action wiring (button calls T-035 endpoint; UI here issues the request but comparison view is T-036).
- Profile navigation (lives here as a route change; profile page is T-023).

## Radical Simplicity Mandate
- No virtualization until the page actually lags — 20 items per page is cheap.
- No "filters service" abstraction; the query string is the source of truth, `Router` + `ActivatedRoute` manage it.

## Page Object(s)
- `SearchPage` in `e2e/pages/search.page.ts`:
  - `search(postal, radiusKm?)`
  - `results(): Promise<CounsellorCardSummary[]>`
  - `openProfileAt(index: number)`
  - `shortlistAt(index: number)`
  - `gotoPage(n: number)`

## ATDD Workflow
1. **RED.** Playwright specs: search L5A 4E6 → first-page results, each showing distance; switch to page 2; change radius; invalid postal shows inline error via `MatError`; empty result renders empty state.
2. **COMMIT:** `test(T-022): add failing search page POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-022): add search page`

## Verification Check
1. **Simpler?** Any template binding wiring nothing?
2. **Complete?** All paths end-to-end.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-005, L2-024)
- Form uses only Material components.
- Results show distance ordered ascending.
- Pagination uses `MatPaginator` at 20 per page.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
