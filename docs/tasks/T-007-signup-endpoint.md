# T-007: Signup endpoint (pending_verification state)

**Traces to:** L2-001 (L1-009)
**Depends on:** T-001
**Est. session:** Small (~2 h)

## Objective
Ship `POST /api/auth/signup` that creates a `pending_verification` user, hashes the password (argon2id or bcrypt cost >= 12), and enqueues a verification email. Duplicate-email submissions return the same generic response as a fresh signup (no account enumeration).

## Scope
**In:**
- User entity with fields: `id`, `email` (normalized lowercase), `passwordHash`, `state` (`pending_verification` | `active` | `disabled`), `createdAt`.
- Password policy validation: min 12 chars, at least one upper, one lower, one digit, one symbol.
- Generic success response regardless of whether the email was new or taken.
- Verification token created with 24-hour TTL, stored hashed (never the raw token in the DB).
- Email dispatch abstracted behind an interface; concrete SMTP provider is injected (no in-process stub in production).

**Out:**
- The email-verify endpoint itself (T-008).
- Rate limiting (T-045).
- UI (T-013).

## Radical Simplicity Mandate
- One handler, one service, one repository interface — no "use case" / "command handler" ceremony unless the chosen stack idiomatically requires it.
- Password policy: a single regex or a single `validate()` function. Not a rule engine.
- Token generation: `crypto.randomBytes(32).toString('hex')`. Nothing more.
- The email template is two lines of plain text plus the link. Do not introduce a template engine for one email.

## ATDD Workflow
1. **RED.** Write API-level Playwright tests against `POST /api/auth/signup`: valid signup → 200 + user stored `pending_verification`; duplicate email → 200 with same generic body; weak password → 400; missing fields → 400. Write a unit test for the hash-and-store service.
2. **COMMIT:** `test(T-007): add failing signup endpoint tests`
3. **GREEN.** Implement the endpoint.
4. **COMMIT:** `feat(T-007): add signup endpoint with verification email`

## Verification Check
1. **Simpler?** Is every file pulling its weight? Delete any DTO or mapper that re-shapes the same fields the request already has.
2. **Complete?** All ACs covered; no "email send" TODO; the concrete SMTP client is wired (tests swap it via interface in the test harness only).
3. **No temporary code?** Grep clean.
4. **No stubs/mocks in prod?** Confirmed — only `tests/` contains the fake mailer.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-001)
1. Given a visitor submits a valid email and policy-compliant password, when they submit, then an account is created in `pending_verification` state and a verification email is sent.
2. Given a visitor submits an email already registered, when they submit, then the system responds with a generic "check your email" message without disclosing account existence.
3. Given a weak or malformed password, when submitted, then a 400 is returned without creating an account.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
- [ ] No plaintext password stored or logged anywhere.
