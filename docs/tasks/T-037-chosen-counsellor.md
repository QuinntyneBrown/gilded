# T-037: Chosen counsellor + spouse notification

**Traces to:** L2-011 AC3 (L1-006)
**Depends on:** T-035, T-016
**Est. session:** Small (~1.5 h)

## Objective
Ship `POST /api/couple/chosen` (body `{ counsellorId }`). Sets the couple's `chosenCounsellorId` and emits a notification to the other spouse via email plus an in-app `MatSnackBar` cue on their next visit.

## Scope
**In:**
- Column `Couple.chosenCounsellorId`.
- Email "Your spouse chose <counsellor name>".
- Simple `Notifications` queue consumed on next authenticated request (returned in `GET /api/me/notifications` and dismissed on read).

**Out:**
- Rich notification centre UI.

## Radical Simplicity Mandate
- One column, one email, one polled endpoint. No WebSocket.

## ATDD Workflow
1. **RED.** API specs: choosing sets the column; other spouse's `/api/me/notifications` returns the item once and it clears after read; email sent.
2. **COMMIT:** `test(T-037): add failing chosen-counsellor tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-037): add chosen counsellor designation`

## Verification Check
1. **Simpler?** Notifications table has only the fields that read requires; no extras.
2. **Complete?** Spouse gets notified; second read returns empty.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-011 AC3)
1. Given a user in a couple marks a counsellor as Chosen, when set, then the couple's `chosenCounsellorId` is updated and the other spouse is notified.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
