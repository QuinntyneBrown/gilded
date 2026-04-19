# T-008: Email verification flow

**Traces to:** L2-001 AC3, AC4 (L1-009)
**Depends on:** T-007
**Est. session:** Small (~1.5 h)

## Objective
Ship `GET /api/auth/verify?token=...`. On valid token, mark the user `active`. On expired or unknown token, respond with a clear 400 and offer a "resend" affordance via `POST /api/auth/resend-verification`.

## Scope
**In:**
- Verify endpoint consumes the token (one-time use).
- Resend endpoint issues a new token, invalidates prior tokens for that user.
- Token comparison uses constant-time equality on the hashed value.

**Out:**
- Login (T-009).
- UI (T-013).

## Radical Simplicity Mandate
- Use the same token-lookup path as reset tokens if the shape is identical. If and only if that identity exists after writing both, extract a shared function — not before.
- No separate "audit log" table for verification events — the `state` transition on the user is sufficient.

## ATDD Workflow
1. **RED.** API-level Playwright specs: valid fresh token → 200, user becomes `active`; expired token → 400; reused token → 400; resend happy path → 200, new token email sent, old token rejected.
2. **COMMIT:** `test(T-008): add failing email verification tests`
3. **GREEN.** Implement endpoints.
4. **COMMIT:** `feat(T-008): add email verification and resend`

## Verification Check
1. **Simpler?** Re-check token comparison path — any duplicated branches?
2. **Complete?** Expired and reused paths both return 400.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-001 AC3, AC4)
1. Given a user clicks a valid verification link within 24 hours, when the link is processed, then the account becomes `active`.
2. Given a verification link older than 24 hours, when clicked, then the system rejects it and offers to resend.
3. Given a token is reused, when submitted again, then the system rejects it.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
