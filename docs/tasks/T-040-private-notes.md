# T-040: Private notes CRUD

**Traces to:** L2-013 (L1-008, L1-010), L2-016
**Depends on:** T-039
**Est. session:** Small (~2 h)

## Objective
Ship `POST / GET / PUT / DELETE /api/notes` scoped to `visibility='private'`. Only the author can see or mutate. Authorization enforced at the repo layer — every query filters `authorId = current_user.id` automatically.

## Scope
**In:**
- CRUD endpoints.
- Repo method `listForAuthor(userId)` used exclusively by the private-notes handlers.
- All reads decrypt via T-039 before returning.

**Out:**
- UI (T-044).
- IDOR comprehensive tests — T-043.

## Radical Simplicity Mandate
- The repo filters by author on every method. The handler passes `userId` in directly; no request-scoped context object.
- No soft-delete; private notes are hard-deleted (T-052 account deletion behavior matches).

## ATDD Workflow
1. **RED.** API specs: author CRUD round-trip; another user calling any endpoint with the note id → 403; admin querying private notes endpoint on behalf of user → 403.
2. **COMMIT:** `test(T-040): add failing private notes CRUD tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-040): add private notes CRUD`

## Verification Check
1. **Simpler?** Is each handler body short and direct?
2. **Complete?** 403 paths proven for every verb.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-013)
1. Given a logged-in user creates a private note, when persisted, then only the author can retrieve it.
2. Given any non-author queries any notes endpoint by id, when executed, then private notes are never returned.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
