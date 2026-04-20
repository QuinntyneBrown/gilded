# T-045: Global rate limiting (auth / reset / invite)

**Traces to:** L2-020 AC1 (L1-013)
**Depends on:** T-007, T-012, T-016
**Est. session:** Small (~1.5 h)

## Objective
Apply a generalised sliding-window per-IP limiter (10 req/min) to signup, login, password reset request, and spouse invite endpoints. Generalizes the T-010 pattern once there are multiple consumers.

## Scope
**In:**
- Reusable limiter middleware accepting `(bucketKey, limit, windowMs)`.
- Wire it onto the four endpoints above at 10 / 60_000.
- `Retry-After` header set.

**Out:**
- Dynamic config UI.

## Radical Simplicity Mandate
- The limiter is a function with four parameters and one return value. No "config schema".
- T-010's implementation is replaced by a parameterised call to this limiter.

## ATDD Workflow
1. **RED.** API specs: 11 requests in one minute against each endpoint → the 11th is 429; per-IP isolation holds.
2. **COMMIT:** `test(T-045): add failing global rate-limit tests`
3. **GREEN.** Extract + apply.
4. **COMMIT:** `feat(T-045): apply global rate limiting to abuse-prone endpoints`

## Verification Check
1. **Simpler?** T-010's bespoke counter deleted; the common one is used for login too.
2. **Complete?** Four endpoints all limited.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-020 AC1)
1. Given login, signup, password reset, or spouse-invite endpoints are called more than 10 times per IP per minute, when exceeded, then subsequent calls return HTTP 429.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
