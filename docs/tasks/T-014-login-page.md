# T-014: Login Angular page + POM

**Traces to:** L2-002 (L1-009), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-009, T-010
**Est. session:** Small (~1.5 h)

## Objective
Ship `/login` using only Material components. On success, redirect to `/search` (post-auth home). On failure, show a generic error. On 429, show a rate-limit message with `Retry-After` value. Ship a `LoginPage` POM.

## Scope
**In:**
- Standalone `LoginPageComponent`.
- Generic error messaging (no enumeration).
- Handling of 429 response.
- Redirect on success.
- `LoginPage` POM.

**Out:**
- "Remember me" toggle — not in requirements.
- SSO.

## Radical Simplicity Mandate
- One component. The handler for 429 is a single conditional branch, not a new error-classification service.
- No shared form-layout component between signup and login — copy the three lines and move on.

## Page Object(s)
- `LoginPage` in `e2e/pages/login.page.ts`:
  - `signIn(email, pwd)` (composite convenience)
  - `expectGenericError()`
  - `expectRateLimited()`
  - `expectRedirectedToSearch()`

## ATDD Workflow
1. **RED.** Playwright specs: happy path (seed an active user, log in, land on `/search`); invalid creds → generic error; six rapid invalids → rate-limit message rendered.
2. **COMMIT:** `test(T-014): add failing login page POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-014): add login page`

## Verification Check
1. **Simpler?** Is there any client-side duplication of backend password policy? Don't duplicate — the backend owns it.
2. **Complete?** 429 path renders the rate-limit message.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-002, L2-024)
- Form uses only Material components.
- Successful login sets the session cookie and routes to `/search`.
- Rate-limited response shows a message sourced from the 429 body.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
