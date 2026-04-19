# T-021: Proximity search endpoint

**Traces to:** L2-005 AC1, AC3 (L1-002)
**Depends on:** T-019, T-020
**Est. session:** Small (~2 h)

## Objective
Ship `GET /api/counsellors?postal=L5A4E6&radiusKm=25&page=1`. Orders by ascending distance from the postal centroid, paginates at 20 per page. Uses a bounding-box prefilter + precise great-circle on the filtered set.

## Scope
**In:**
- Endpoint with query parameters `postal` (required), `radiusKm` (default 25), `page` (default 1).
- Precomputed `lat`, `lng` columns on `Counsellor`; one index on (lat, lng).
- Response items include distanceKm.
- Pagination at 20.

**Out:**
- Full-text search on name/specialty (not in L2).
- UI (T-022).

## Radical Simplicity Mandate
- Great-circle via the haversine formula inline — ~10 lines. No geospatial library for a single function.
- Bounding-box computed once per request from `radiusKm`. Single SQL query. No map-reduce.
- No "search filter object" — the query string parameters are the contract.

## ATDD Workflow
1. **RED.** API Playwright specs: seed 25 counsellors at known lat/lng; search for L5A 4E6 radius 25 km returns expected ordered subset; page 2 returns remaining; default radius is 25; invalid postal → 400 without geocoding.
2. **COMMIT:** `test(T-021): add failing proximity search tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-021): add proximity search endpoint`

## Verification Check
1. **Simpler?** Is the haversine implementation one function, inlined where used? Any unused query parameters?
2. **Complete?** 20-per-page pagination confirmed; order verified.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-005 AC1, AC3)
1. Given a user enters a valid postal code and a radius (default 25 km), when they search, then results are returned ordered by ascending distance.
2. Given a search that returns more than 20 results, when rendered, then results are paginated at 20 per page.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
