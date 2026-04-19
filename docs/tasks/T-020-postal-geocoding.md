# T-020: Postal code geocoding + cache

**Traces to:** L2-005 AC1, AC2, AC4 (L1-002, L1-012)
**Depends on:** T-019
**Est. session:** Small (~2 h)

## Objective
Ship a `GeocodingService` that returns `{ lat, lng }` for a Canadian or US postal/ZIP code. Uses an upstream provider (e.g., Google Geocoding API / Geocodio) and caches results forever in a local `postal_codes` table. Keyed by normalized postal code. Invalid formats fail fast without calling upstream.

## Scope
**In:**
- `postal_codes` table: `code`, `lat`, `lng`, `fetchedAt`.
- Service wrapping the upstream provider behind an interface.
- Canadian postal regex `^[A-CEGHJ-NPRSTVXY]\d[A-CEGHJ-NPRSTV-Z] ?\d[A-CEGHJ-NPRSTV-Z]\d$` (case-insensitive, optional space).
- US ZIP regex `^\d{5}(-\d{4})?$`.
- Latency budget: p95 <= 1000 ms for cached, <= 2500 ms uncached.

**Out:**
- Distance calculation (T-021 does that using lat/lng).
- UI (T-022).

## Radical Simplicity Mandate
- One service, one table, one interface. No "GeocoderFactory". No pluggable provider registry. Inject the one concrete by name.
- Cache lookup is `SELECT lat,lng FROM postal_codes WHERE code=?`. Invalidate only if a later requirement demands it.

## ATDD Workflow
1. **RED.** Unit + integration tests: cached postal → upstream not called; uncached → upstream called once and persisted; invalid format → `InvalidPostalCode` error without upstream call; latency budget test with the upstream faked to 200 ms returns in <1000 ms.
2. **COMMIT:** `test(T-020): add failing postal geocoding tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-020): add postal code geocoding with cache`

## Verification Check
1. **Simpler?** Is the cache key exactly the normalized code? Remove any hashing / prefixing that provides nothing.
2. **Complete?** Both countries validated; upstream key loaded from env with no fallback default.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-005 AC1, AC2, AC4)
1. Given a user enters a valid Canadian or US postal/ZIP code, when they search, then results are returned ordered by ascending distance from the postal centroid.
2. Given an invalid postal code format, when submitted, then the system returns a validation error without calling the geocoder.
3. Given a search, when it executes, then p95 response time must be <= 1000 ms for cached postal codes and <= 2500 ms for uncached.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
- [ ] Upstream API key never logged.
