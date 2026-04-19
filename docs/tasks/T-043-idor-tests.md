# T-043: IDOR test suite for notes

**Traces to:** L2-016 AC3 (L1-010)
**Depends on:** T-040, T-041, T-042
**Est. session:** Small (~1.5 h)

## Objective
Ship a dedicated IDOR-focused Playwright suite exercising every note endpoint with tampered ids, mismatched visibility parameters, cross-couple access attempts, and URL-manipulation attempts. Build is red if any probe succeeds.

## Scope
**In:**
- Suite `e2e/specs/security.idor.notes.spec.ts`.
- Fixtures: user A, user B (not A's spouse), user C (A's spouse), user D (solo).
- Probes:
  - User B GET A's private note id → 403.
  - User B PUT A's private note id → 403.
  - User D GET A+C's spouse note id → 403.
  - User D POST `/api/notes?visibility=spouse` → 409.
  - User B filters `authorId=A` on their own list endpoint → only own items returned.
  - Admin (role=admin) GET A's private note id → 403 (admins explicitly denied per L2-013 AC2).
  - Changing `visibility=public` query param on a private-id fetch → 403.

**Out:**
- Automated security scanners (nice-to-have; future).

## Radical Simplicity Mandate
- One spec file. Shared fixture builder. No custom assertion helper — `expect(response.status).toBe(403)`.

## ATDD Workflow
1. **RED.** Add the spec; run it; it initially fails in the design of the fixture builder only (not because of insecure endpoints — the earlier tasks should have passed these probes). If any probe fails for a real reason, that is a bug to fix in the upstream task before moving on.
2. **COMMIT:** `test(T-043): add IDOR probes for notes endpoints`
3. **GREEN.** Implement the fixture builder if missing. If any upstream insecurity is found, fix in the owning task file and land a separate commit on that branch.
4. **COMMIT:** `feat(T-043): wire IDOR probe fixtures`

## Verification Check
1. **Simpler?** One fixture builder, no per-test setup boilerplate.
2. **Complete?** All eight probes above execute.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-016 AC3)
1. Given automated IDOR tests against notes endpoints, when run, then all probes return 403/409 (per test expectation) with no leakage of foreign note content.

## Done When
- [ ] All IDOR probes green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
