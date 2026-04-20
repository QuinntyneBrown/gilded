# T-050: Metrics endpoint

**Traces to:** L2-021 AC3 (L1-014)
**Depends on:** T-049
**Est. session:** XS (~1 h)

## Objective
Expose `GET /metrics` (Prometheus text format or equivalent) with request rate, error rate, p50 / p95 / p99 latency, and authentication failure rate.

## Scope
**In:**
- `prom-client` (or chosen stack equivalent) registered once.
- Histogram for latency labelled by route, counter for auth failures.
- `GET /metrics` guarded by an internal network check (IP allowlist or auth token — choose one and justify in verification).

**Out:**
- Custom dashboards (operate out-of-repo).

## Radical Simplicity Mandate
- One file wiring metric registrations. No "metrics service" class.

## ATDD Workflow
1. **RED.** Integration test: hit a handful of endpoints, scrape `/metrics`, assert required series present.
2. **COMMIT:** `test(T-050): add failing metrics endpoint tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-050): expose metrics endpoint`

## Verification Check
1. **Simpler?** Registrations happen once at boot; no repeated registration per request.
2. **Complete?** All required series present.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-021 AC3)
1. Given the system is running, when metrics are scraped, then request rate, error rate, p50/p95/p99 latency, and auth failure rate are available.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
