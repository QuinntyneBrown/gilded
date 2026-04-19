# T-009: Login + HTTP-only session cookie

**Traces to:** L2-002 AC1, AC2 (L1-009)
**Depends on:** T-007, T-008
**Est. session:** Small (~2 h)

## Objective
Ship `POST /api/auth/login`. On success, issue a signed session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`), 30-day lifetime with sliding expiration. On failure, return a generic error. Session storage is server-side (DB row keyed by session id); cookie carries only the id.

## Scope
**In:**
- Login endpoint: verifies password hash, creates session row, sets cookie.
- Session row: `id`, `userId`, `expiresAt`, `lastSeenAt`.
- Sliding expiration refresh on authenticated requests.
- Response body contains the user's public profile (no email leak on unknown users).

**Out:**
- Rate limiting (T-010).
- Logout (T-011).
- CSRF token rollout (covered by cookie + SameSite for this app's surface; if a later requirement adds cross-origin, add then).

## Radical Simplicity Mandate
- One cookie, one table, one middleware that reads the cookie and loads the session.
- No JWT. No refresh token choreography — sliding expiration on a server-side session is simpler and fits the 30-day window.
- No "auth module" with 10 files. A middleware, a service, a repo.

## ATDD Workflow
1. **RED.** API Playwright specs: valid creds → 200 + cookie set; invalid creds → 401; cookie attributes `HttpOnly`, `Secure`, `SameSite=Lax` asserted; unverified account → 401; subsequent authenticated request refreshes `lastSeenAt`.
2. **COMMIT:** `test(T-009): add failing login session tests`
3. **GREEN.** Implement endpoint and middleware.
4. **COMMIT:** `feat(T-009): add login endpoint and session cookie`

## Verification Check
1. **Simpler?** Is the middleware doing anything it doesn't need to? Does each line serve a requirement?
2. **Complete?** Sliding expiration actually slides; confirmed by a test that advances time mid-session.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-002 AC1, AC2)
1. Given valid credentials on an active account, when the user logs in, then a session is created with an HTTP-only, Secure, SameSite=Lax cookie and a session lifetime of 30 days with sliding expiration.
2. Given invalid credentials, when the user attempts login, then the system returns a generic error and increments a rate-limit counter (the counter is implemented in T-010).

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
- [x] Cookie attributes verified by an automated test.
