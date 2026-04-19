# T-052: Account and data deletion

**Traces to:** L2-023 (L1-010, L1-009)
**Depends on:** T-009, T-040, T-041, T-042, T-017
**Est. session:** Small (~2.5 h)

## Objective
Let a user request deletion and have their data removed within 30 days per the spec. Requesting queues the job and disables login immediately; a scheduled worker finalizes within 30 days, hard-deleting private notes and the user's spouse-shared notes, anonymizing public reviews/comments/notes (author → `[deleted user]`), and dissolving the couple if applicable.

## Scope
**In:**
- `POST /api/me/delete` → marks `user.state='pending_deletion'`, sends confirmation email, invalidates sessions.
- Scheduled worker with idempotent execution: deletes eligible users once `createdAt + 30d` reached.
- Anonymization path for public content replaces `authorId` with sentinel `[deleted user]` and scrubs display name.
- Couple dissolve reuses T-017 logic.

**Out:**
- Backup purge — noted as compliance obligation but implemented only if infra is in scope.

## Radical Simplicity Mandate
- Single deletion worker module. No saga; the worker does everything in one transaction per user.
- Anonymization replaces `displayName` and nulls `authorId`; no separate "deleted users" table.

## ATDD Workflow
1. **RED.** Integration tests: deletion request disables login + sends email; simulated clock-forward by 30 days runs the worker and purges correctly; anonymization verified.
2. **COMMIT:** `test(T-052): add failing account deletion tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-052): add account and data deletion`

## Verification Check
1. **Simpler?** Worker body reads top-to-bottom; no branching framework.
2. **Complete?** Private + spouse + public handled per spec; couple dissolve verified.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-023)
1. Given a user requests deletion and confirms, when processed, then within 30 days private notes are hard-deleted, spouse-shared notes authored by the user are hard-deleted, public reviews/comments/notes are anonymized, and the couple is dissolved if applicable.
2. Given a deletion request, when submitted, then a confirmation email is sent and the account is immediately disabled from login.
3. Given deletion completes, when audited, then no PII belonging to the deleted user remains in primary stores.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
