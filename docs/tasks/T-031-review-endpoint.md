# T-031: Review endpoint

**Traces to:** L2-010 AC1, AC4 (L1-005)
**Depends on:** T-019, T-033
**Est. session:** Small (~2 h)

## Objective
Ship `POST /api/counsellors/:id/reviews` and `DELETE /api/reviews/:id`. Review body 20-4000 chars, runs through the moderation ruleset (T-033). Author-deletes soft-delete with body "[removed by author]"; moderator deletes are covered in T-028-style admin paths but surfaced here as a `DELETE` with `actor=moderator` replacing body with "[removed by moderator]".

## Scope
**In:**
- `Review` table: `id`, `counsellorId`, `authorId`, `body`, `createdAt`, `deletedAt` (nullable), `deletedBy` (`null | 'author' | 'moderator'`).
- `GET /api/counsellors/:id/reviews` returns reviews ordered `createdAt DESC`; soft-deleted reviews are returned with substituted body and no author id.

**Out:**
- Comments (T-032).
- UI (T-034).

## Radical Simplicity Mandate
- Soft-delete is a single timestamp + enum. No separate audit table.
- One endpoint for author-delete. No separate moderator-delete endpoint — role check in the same handler.

## ATDD Workflow
1. **RED.** API Playwright specs: create review 20-4000 ok; <20 or >4000 → 400; author DELETE replaces body; non-author non-moderator DELETE → 403; moderator DELETE replaces body with "[removed by moderator]"; moderation ruleset rejection path (T-033 stubs rejecting content) returns 422.
2. **COMMIT:** `test(T-031): add failing review endpoint tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-031): add review endpoint`

## Verification Check
1. **Simpler?** One handler per verb; role check inline.
2. **Complete?** Both soft-delete paths cover the rendered body.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-010 AC1, AC4, AC5)
1. Given a logged-in user posts a review of 20-4000 characters, when stored, then it is saved with author, counsellorId, timestamp, and visibility=public.
2. Given the author deletes the review, when deleted, then the content is soft-deleted and replaced with "[removed by author]".
3. Given a moderator removes the review, when removed, then it is replaced with "[removed by moderator]".

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
