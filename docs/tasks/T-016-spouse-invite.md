# T-016: Spouse invitation (send + accept)

**Traces to:** L2-004 AC1, AC2, AC3 (L1-001)
**Depends on:** T-009
**Est. session:** Small (~2 h)

## Objective
Ship `POST /api/couple/invite` and `POST /api/couple/accept`. An authenticated user emails an invite to a spouse address. The invitee (logged in, possibly brand new) accepts; the system creates a `couple` row and sets `spouseId` on both users. If either user is already in a couple, reject.

## Scope
**In:**
- `Couple` entity: `id`, `createdAt`.
- `User.spouseId`, `User.coupleId`.
- `CoupleInvite` entity: `id`, `inviterId`, `inviteeEmail`, `tokenHash`, `expiresAt` (7 days).
- Send endpoint: must be authenticated; rejects self-invite.
- Accept endpoint: creates `Couple`, links both users atomically, burns the token.
- Reject errors: already-coupled, expired token, self-invite.

**Out:**
- Spouse UI (T-018).
- Unlink (T-017).
- Invite rate limiting (T-045).

## Radical Simplicity Mandate
- Single transaction per accept. No saga.
- No "invitations service" interface; direct repo calls in the handler are fine for two endpoints.
- Email template is two lines.

## ATDD Workflow
1. **RED.** API Playwright specs: happy-path send → accept → both users show correct `spouseId` + shared `coupleId`; already-coupled inviter → 409; self-invite → 400; expired token → 400.
2. **COMMIT:** `test(T-016): add failing spouse invite tests`
3. **GREEN.** Implement both endpoints.
4. **COMMIT:** `feat(T-016): add spouse invitation send and accept`

## Verification Check
1. **Simpler?** Is the accept handler atomic? Fewer DB round trips if possible.
2. **Complete?** All three error paths return the correct codes.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-004 AC1, AC2, AC3)
1. Given a logged-in user, when they send a spouse-link invitation to an email, then an invitation token valid for 7 days is emailed.
2. Given the invited user accepts while logged in, when accepted, then both accounts are joined to a single `couple` record and each user's `spouseId` is set.
3. Given a user already in a couple, when they attempt to send or accept another invitation, then the system rejects it with a clear error.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
