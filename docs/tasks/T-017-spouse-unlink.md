# T-017: Spouse unlink and cascade rules

**Traces to:** L2-004 AC4 (L1-001, L1-010)
**Depends on:** T-016
**Est. session:** Small (~1.5 h)

## Objective
Ship `POST /api/couple/unlink`. Either spouse can dissolve the couple. After unlink: the `couple` row is deleted; each user's `spouseId` and `coupleId` are cleared; spouse-shared notes authored by each user remain *private to their original authors* (T-041 depends on this rule).

## Scope
**In:**
- Unlink endpoint.
- Cascade conversion: `note.visibility = 'spouse'` → `note.visibility = 'private'` on each note the author still owns; no content lost.
- Audit-safe: the unlink emits a domain event `CoupleDissolved { coupleId, userIds, at }` consumed by anyone who needs it (T-041, T-052).

**Out:**
- UI (T-018).

## Radical Simplicity Mandate
- One transaction. One event emission. No saga.
- The cascade is one `UPDATE notes SET visibility='private' WHERE coupleId = ?`. Don't build a migration framework for it.

## ATDD Workflow
1. **RED.** API Playwright specs: setup couple + one spouse-shared note per user → unlink → both users see their own notes as `private`, none visible to the other.
2. **COMMIT:** `test(T-017): add failing spouse unlink tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-017): add spouse unlink with cascade`

## Verification Check
1. **Simpler?** Can the cascade be expressed as one SQL/ORM statement per side?
2. **Complete?** Event is emitted; both users fully detached.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-004 AC4)
1. Given a user in a couple, when they choose unlink, then the couple is dissolved, spouse-shared notes become private to their original authors, and both users may form new couples.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
- [ ] `CoupleDissolved` event emitted and captured by at least one integration test.
