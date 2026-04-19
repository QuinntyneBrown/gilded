# T-046: Per-user rate limiting on reviews / notes

**Traces to:** L2-020 AC2 (L1-013)
**Depends on:** T-031, T-032, T-042, T-045
**Est. session:** XS (~1 h)

## Objective
Cap a single authenticated user to 20 review/comment/public-note creations per hour across all endpoints combined. Additional attempts return 429.

## Scope
**In:**
- Reuse the T-045 limiter with `bucketKey = userId + ':creates'`, `limit = 20`, `windowMs = 3_600_000`.
- Applied at the handler entry for creation of reviews, comments, and public notes.

**Out:**
- Per-endpoint limits.

## Radical Simplicity Mandate
- No second limiter. No new config surface.

## ATDD Workflow
1. **RED.** API spec: a single user posts 21 items in an hour → 21st returns 429.
2. **COMMIT:** `test(T-046): add failing per-user creation limit test`
3. **GREEN.** Wire.
4. **COMMIT:** `feat(T-046): add per-user creation rate limit`

## Verification Check
1. **Simpler?** Single call site wrapper; no duplication.
2. **Complete?** All three verbs covered by one bucket.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-020 AC2)
1. Given a single user creates more than 20 reviews/comments/public notes per hour, when exceeded, then further creations return 429.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
