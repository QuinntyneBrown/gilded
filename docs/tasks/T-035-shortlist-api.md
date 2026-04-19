# T-035: Shortlist API (couple-scoped)

**Traces to:** L2-011 AC1 (L1-006)
**Depends on:** T-016, T-019
**Est. session:** Small (~1.5 h)

## Objective
Ship endpoints for a couple's shared shortlist: `POST /api/shortlist/:counsellorId`, `DELETE /api/shortlist/:counsellorId`, `GET /api/shortlist`. Single shortlist per couple; solo users also get a personal shortlist keyed by their own user id (until they enter a couple, at which point merge rules do not apply — personal items migrate to the new couple shortlist on link).

## Scope
**In:**
- `ShortlistItem` table: `{ coupleId | userId, counsellorId, addedAt, addedBy }`.
- Dedup by `(ownerKey, counsellorId)`.
- On `CoupleCreated` (T-016): merge any existing per-user shortlist items into the couple's shortlist.

**Out:**
- UI (T-036).

## Radical Simplicity Mandate
- One composite key (either `coupleId` xor `userId`). No polymorphic "Owner" entity.
- Event consumer for CoupleCreated is 5 lines.

## ATDD Workflow
1. **RED.** API specs: add, dedup, remove, list; after couple link both spouses see the union.
2. **COMMIT:** `test(T-035): add failing shortlist API tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-035): add shortlist API`

## Verification Check
1. **Simpler?** Composite key inline; no owner abstraction.
2. **Complete?** Merge on couple-create verified.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-011 AC1)
1. Given a user clicks Shortlist on a counsellor, when stored, then the counsellor is added to the owner's shortlist (couple or self).

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
