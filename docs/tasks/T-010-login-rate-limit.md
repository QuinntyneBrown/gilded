# T-010: Login rate limiting and 429 lockout

**Traces to:** L2-002 AC3 (L1-009, L1-013)
**Depends on:** T-009
**Est. session:** Small (~1 h)

## Objective
Reject login attempts with HTTP 429 after 5 failures within 15 minutes, keyed by `(accountEmail, sourceIp)`. This task stands up the mechanism for login specifically. A generalised abuse limiter follows in T-045.

## Scope
**In:**
- Sliding-window counter (Redis if present; otherwise in-process LRU with explicit note that single-node deployment is assumed).
- 429 response body: minimal, no timing oracle (do not reveal whether the account exists).
- `Retry-After` header set.

**Out:**
- CAPTCHA (T-047).
- Account lockout UI messaging (covered in T-014 login page).

## Radical Simplicity Mandate
- One counter keyed by `sha256(email) + ":" + ip`. Nothing else.
- No "bucket strategy" abstraction. Literal counter + TTL.
- Do not build a "rate limit service" generic enough to handle later needs — T-045 will generalize when two use-cases exist.

## ATDD Workflow
1. **RED.** API Playwright spec: loop 6 failed logins from the same IP against the same email, assert the 6th returns 429 with `Retry-After`. A separate IP is not affected.
2. **COMMIT:** `test(T-010): add failing login rate-limit test`
3. **GREEN.** Implement counter + middleware.
4. **COMMIT:** `feat(T-010): add login rate limiting`

## Verification Check
1. **Simpler?** Confirm no configuration surface beyond the two numbers (5, 15). If config.js/env flags were added, revert — keep the constants inline with a comment citing L2-002 AC3.
2. **Complete?** Window rolls off correctly (test with time advance).
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-002 AC3)
1. Given 5 failed attempts within 15 minutes for the same account or IP, when another attempt is made, then the system rejects it with HTTP 429.
2. Given the 15-minute window elapses, when a new attempt is made, then it is allowed.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
