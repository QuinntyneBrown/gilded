# T-041: Spouse-shared notes CRUD

**Traces to:** L2-014 (L1-008, L1-010), L2-016
**Depends on:** T-039, T-016, T-017
**Est. session:** Small (~2 h)

## Objective
Ship endpoints for `visibility='spouse'`. Only the author and their linked spouse can read. Only the author can mutate. Rejects creation if the user is not in a couple. Honors the T-017 `CoupleDissolved` cascade: after unlink, the former spouse no longer sees the notes; the author still does (now reclassified as private — performed by T-017's cascade, not here).

## Scope
**In:**
- `POST / GET / PUT / DELETE /api/notes?visibility=spouse`.
- Repo method `listForCouple(coupleId, requesterUserId)` that accepts reads by either spouse.
- Creation rejected with 409 if `user.coupleId` is null.

**Out:**
- UI (T-044).
- Cascade logic (T-017 owns it — this task depends on T-017 having run).

## Radical Simplicity Mandate
- Read path accepts both spouses; mutate path restricts to author.
- No "couple-scoped repository" base class — one repo method, parameterized.

## ATDD Workflow
1. **RED.** API specs: create spouse note, both spouses read; non-couple user tries to create → 409; non-spouse third party → 403; non-author spouse tries to PUT → 403; after unlink the former spouse sees nothing for those notes.
2. **COMMIT:** `test(T-041): add failing spouse notes CRUD tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-041): add spouse-shared notes CRUD`

## Verification Check
1. **Simpler?** Is there one shared filter chain between private and spouse reads? Keep them separate — separate concerns keep the guard narrow.
2. **Complete?** All AC paths covered.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-014)
1. Given a user in a couple creates a spouse note, when stored, then both spouses can read it.
2. Given a user not in a couple, when they create a spouse note, then 409 is returned.
3. Given a couple is dissolved, when a former spouse queries spouse notes, then none authored by the other are returned.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
