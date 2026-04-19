# T-042: Public notes CRUD

**Traces to:** L2-015 (L1-008), L2-016
**Depends on:** T-039, T-033
**Est. session:** Small (~1.5 h)

## Objective
Ship endpoints for `visibility='public'`. All authenticated users can read. Only author can mutate. Creation and update run through T-033 moderation ruleset. Public notes display the author's `displayName`, not email.

## Scope
**In:**
- `POST / GET / PUT / DELETE /api/notes?visibility=public`.
- `GET /api/notes/public` feed endpoint (paginated, latest-first).
- Moderation rejection returns 422.

**Out:**
- UI (T-044).

## Radical Simplicity Mandate
- Plaintext storage for public notes. No accidental encryption.
- Feed endpoint: `ORDER BY createdAt DESC LIMIT 20 OFFSET ?`.

## ATDD Workflow
1. **RED.** API specs: author CRUD; any other user reads feed; profane content → 422; display name shown, email never.
2. **COMMIT:** `test(T-042): add failing public notes CRUD tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-042): add public notes CRUD`

## Verification Check
1. **Simpler?** Confirm no cryptographic path touches public notes.
2. **Complete?** Moderation integrated.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-015)
1. Given a logged-in user creates a public note, when submitted, then it is readable by all authenticated users.
2. Given the content fails moderation, when submitted, then the system returns 422 and does not persist.
3. Given a public note is displayed, when rendered, then the author's display name (not email) is shown.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
