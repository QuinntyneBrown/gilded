# T-028: Moderation queue (approve / reject)

**Traces to:** L2-008 AC3, AC4 (L1-004)
**Depends on:** T-027
**Est. session:** Small (~2 h)

## Objective
Ship the moderator-facing endpoints and a single admin list UI. Pending rows are invisible from public search until approved. Rejected rows remain in storage with state `rejected` plus a reason; the submitter is notified.

## Scope
**In:**
- Role check: `user.role === 'moderator' | 'admin'` required on `GET /api/admin/counsellors/pending`, `POST /api/admin/counsellors/:id/approve`, `POST /api/admin/counsellors/:id/reject`.
- Reject body: `{ reason: string }` — emailed to submitter.
- Search (T-021) excludes rows where `moderationState !== 'approved'` and `source === 'user_submitted'`. (`web_research` rows are visible immediately per T-025.)
- Minimal admin list page `/admin/counsellors/pending` rendering pending items as `MatTable` with Approve / Reject buttons and a `MatDialog` reason prompt.

**Out:**
- Moderator assignment, SLAs, audit trail beyond a `reviewedBy` column.

## Radical Simplicity Mandate
- One role guard. One table component. One dialog. No admin shell — use the same app shell.

## Page Object(s) (for the admin page)
- `ModerationQueuePage` in `e2e/pages/moderation-queue.page.ts`:
  - `approveAt(index)`
  - `rejectAt(index, reason)`
  - `pendingCount(): Promise<number>`

## ATDD Workflow
1. **RED.** API + Playwright specs: non-moderator → 403; approve flips `moderationState` to `approved` and the row appears in search; reject flips to `rejected`, submitter receives the reason email.
2. **COMMIT:** `test(T-028): add failing moderation queue tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-028): add moderation queue`

## Verification Check
1. **Simpler?** Is the role guard a function, not a class hierarchy? Remove unused enum values.
2. **Complete?** Search visibility rules match AC3; submitter notification verified.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-008 AC3, AC4)
1. Given a submission, when saved, then the system queues a moderation review before the record becomes publicly searchable.
2. Given a moderator rejects a submission, when rejected, then the submitter is notified with a reason.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
