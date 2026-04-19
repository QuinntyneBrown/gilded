# T-053: Performance budget and LCP check in CI

**Traces to:** L2-018 (L1-012)
**Depends on:** T-022, T-023, T-044
**Est. session:** Small (~2 h)

## Objective
Wire a Playwright-driven Lighthouse / Web Vitals check to enforce LCP <= 2.5s on Moto-G4 / 4G profile for each primary route. Fail CI on regression. Separately, API-level p95 budget checks enforced with a load generator stage (100 virtual users across proximity search) assert <=500 ms server response and <0.5% error rate.

## Scope
**In:**
- `playwright.config.ts` project `perf-budgets` with `devices['Moto G4']`.
- `e2e/specs/perf/*.spec.ts` for search, profile, notes.
- Load stage script using `autocannon` (or k6): 100 VU × 60s against `GET /api/counsellors?postal=L5A4E6`; fails if error% >= 0.5 or p95 > 500 ms.
- CI job `perf-budget` that blocks merge on failure.

**Out:**
- Production RUM — future.

## Radical Simplicity Mandate
- One perf spec per primary route. One load script. No bespoke reporting layer — failures show in Playwright / CI output directly.

## ATDD Workflow
1. **RED.** Add perf specs and load script with the stated budgets; they should fail against an un-tuned baseline until bottlenecks are addressed.
2. **COMMIT:** `test(T-053): add failing performance budget specs`
3. **GREEN.** Tune where needed (image sizes, query plans) until budgets pass.
4. **COMMIT:** `perf(T-053): meet LCP and latency budgets`

## Verification Check
1. **Simpler?** One config addition, one script, three specs.
2. **Complete?** All budgets verified.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-018)
1. Given a cold load on a mid-tier mobile device over 4G, when any primary page loads, then LCP <= 2.5s.
2. Given authenticated API calls for notes list, shortlist, or profile view, when executed at p95, then server response time <= 500 ms.
3. Given 100 concurrent users performing searches, when the system is under load, then error rate < 0.5%.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
