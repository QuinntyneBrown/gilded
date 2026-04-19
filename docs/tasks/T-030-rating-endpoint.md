# T-030: Rating endpoint + aggregate projection

**Traces to:** L2-009 (L1-005), L2-006 AC2
**Depends on:** T-019
**Est. session:** Small (~2 h)

## Objective
Ship `PUT /api/counsellors/:id/rating` with body `{ stars: 1..5 }`. Idempotent: one rating per (user, counsellor), subsequent PUTs update. After each write, recompute `averageRating` (one decimal place) and `reviewCount` on the counsellor row (a stored projection, not computed on read).

## Scope
**In:**
- `CounsellorRating` table: `(userId, counsellorId)` primary key, `stars`, `updatedAt`.
- Recompute triggered in the same transaction: `UPDATE counsellors SET averageRating = ROUND(AVG(stars), 1), reviewCount = COUNT(*) WHERE id=?`.
- Integer-only 1..5 validation.

**Out:**
- UI (T-034).
- Separate review text (T-031).

## Radical Simplicity Mandate
- One endpoint, one table, one recompute. No "aggregator service" layer.
- One SQL statement for recompute — keep it in the handler if the ORM doesn't obscure it.

## ATDD Workflow
1. **RED.** API Playwright specs: first PUT stores; second PUT from same user replaces; aggregate returns one decimal; 0 and 6 stars → 400; unauthenticated → 401.
2. **COMMIT:** `test(T-030): add failing rating endpoint tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-030): add rating endpoint with aggregate`

## Verification Check
1. **Simpler?** Inline the recompute; no service indirection.
2. **Complete?** Aggregate updated after both insert and update paths.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-009)
1. Given a user submits a rating 1..5, when stored, then it is keyed by (userId, counsellorId) and the aggregate is recomputed.
2. Given a user has already rated, when they submit a new rating, then the prior rating is updated.
3. Given a rating outside 1..5, when submitted, then the system rejects it with HTTP 400.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
