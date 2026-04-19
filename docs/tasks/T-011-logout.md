# T-011: Logout invalidates session server-side

**Traces to:** L2-002 AC4 (L1-009)
**Depends on:** T-009
**Est. session:** XS (~30 min)

## Objective
`POST /api/auth/logout` deletes the server-side session row and clears the cookie. Any subsequent request with that cookie is treated as unauthenticated.

## Scope
**In:**
- Endpoint + middleware behavior on a revoked cookie.

**Out:**
- "Log out from all devices" — not required by any L2. Do not add.

## Radical Simplicity Mandate
- One handler. Three lines of body.

## ATDD Workflow
1. **RED.** API Playwright spec: authenticated request succeeds → logout → same cookie replayed → 401.
2. **COMMIT:** `test(T-011): add failing logout test`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-011): add logout`

## Verification Check
1. **Simpler?** Handler body can literally be: lookup session, delete row, clear cookie, 204. If it has more, remove the extra.
2. **Complete?** Confirmed via the cookie-replay assertion.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-002 AC4)
1. Given a logged-in user, when they click logout, then the session is invalidated server-side and the cookie is cleared.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
