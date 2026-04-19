# T-012: Password reset (request + complete)

**Traces to:** L2-003 (L1-009)
**Depends on:** T-007
**Est. session:** Small (~2 h)

## Objective
Ship `POST /api/auth/reset-request` and `POST /api/auth/reset-complete`. The request endpoint always returns 200 (no account enumeration). The complete endpoint consumes a single-use token, sets a compliant new password, invalidates all existing sessions for that user, and burns the token.

## Scope
**In:**
- Request endpoint: always 200; if the account exists, email a single-use reset token (1-hour TTL), hashed at rest.
- Complete endpoint: validate token, validate new password against policy, update hash, delete all sessions for the user.

**Out:**
- UI (T-015).
- Rate limiting (T-045).

## Radical Simplicity Mandate
- If T-008 already wrote a token lookup helper and it fits unchanged, reuse it. If extending it grows branches, write a second small helper instead.
- No "reset flow" state machine. Two endpoints.

## ATDD Workflow
1. **RED.** API Playwright specs: unknown email → 200 (and no email actually sent by the fake mailer); known email → 200 + email captured; valid token + compliant password → 200 and all prior sessions 401 on replay; expired token → 400; reused token → 400.
2. **COMMIT:** `test(T-012): add failing password reset tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-012): add password reset`

## Verification Check
1. **Simpler?** Is session invalidation a one-liner `deleteMany({ userId })`? If more, ask why.
2. **Complete?** All L2-003 ACs covered.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-003)
1. Given a user requests a reset for any email, when submitted, then the system responds 200 regardless and, if the account exists, sends a single-use token valid for 1 hour.
2. Given a valid reset token, when the user submits a new compliant password, then the password is updated, all existing sessions are invalidated, and the token is consumed.
3. Given an expired or reused token, when submitted, then the system rejects it.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
