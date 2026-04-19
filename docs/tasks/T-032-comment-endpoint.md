# T-032: Comment endpoint

**Traces to:** L2-010 AC2, AC4, AC5 (L1-005)
**Depends on:** T-031, T-033
**Est. session:** Small (~1.5 h)

## Objective
Ship `POST /api/reviews/:reviewId/comments` and `DELETE /api/comments/:id`. 1-1000 chars. Moderation (T-033) and soft-delete rules identical to T-031.

## Scope
**In:**
- `Comment` table: same shape as `Review` minus the `counsellorId` (derived via `reviewId`).
- List endpoint `GET /api/reviews/:reviewId/comments` with soft-delete substitution.

**Out:**
- Nested comments (not required).

## Radical Simplicity Mandate
- Copy of T-031 handler with three field changes. Do not extract a shared base class until a third similar entity appears.

## ATDD Workflow
1. **RED.** API specs mirroring T-031.
2. **COMMIT:** `test(T-032): add failing comment endpoint tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-032): add comment endpoint`

## Verification Check
1. **Simpler?** If T-031 and T-032 diverge only in field names, leave them as two short handlers — do not over-generalize.
2. **Complete?** All three AC paths covered.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-010 AC2, AC4, AC5)
1. Given any user posts a comment of 1-1000 characters, when stored, then it is saved with author, reviewId, and timestamp.
2. Given the author deletes it, when deleted, then it renders "[removed by author]".
3. Given a moderator removes it, when removed, then it renders "[removed by moderator]".

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
