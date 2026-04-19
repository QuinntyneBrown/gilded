# T-047: CAPTCHA on signup + review creation

**Traces to:** L2-020 AC3 (L1-013)
**Depends on:** T-007, T-031
**Est. session:** Small (~2 h)

## Objective
Integrate a CAPTCHA (e.g., Cloudflare Turnstile or Google reCAPTCHA v3) so that signup and review-creation endpoints require a valid token when automated abuse is suspected (always-on in prod, skippable only when `CAPTCHA_DISABLED=true` in local-dev `.env.dev`).

## Scope
**In:**
- Shared `CaptchaVerifier` module — one interface, one concrete provider.
- Middleware applied on the two endpoints.
- Angular form field rendering the CAPTCHA widget via the provider's script. No wrapper component — mount the provider's widget directly in the two forms.

**Out:**
- Invisible CAPTCHA elsewhere.

## Radical Simplicity Mandate
- One provider. One verifier. No per-environment pluggability other than an env-driven skip for local-dev.

## ATDD Workflow
1. **RED.** API specs: signup without `captchaToken` → 400; with an invalid token → 400; with a valid test token (provider supplies test keys) → 200. Review create mirrors.
2. **COMMIT:** `test(T-047): add failing CAPTCHA verifier tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-047): add CAPTCHA on signup and review creation`

## Verification Check
1. **Simpler?** One middleware function. No config proliferation.
2. **Complete?** Both endpoints enforced.
3. **No temporary code?** Confirmed; the dev-skip flag is honoured only when `NODE_ENV !== 'production'`.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-020 AC3)
1. Given the signup or review-creation endpoint is called without a valid CAPTCHA token, when invoked, then the request is rejected.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
