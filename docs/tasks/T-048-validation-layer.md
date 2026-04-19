# T-048: Server-side input validation layer

**Traces to:** L2-019 AC1, AC2, AC3 (L1-013)
**Depends on:** T-001
**Est. session:** Small (~2 h)

## Objective
Adopt a single schema validation library (e.g., Zod) and apply a schema to every request handler. All queries use parameterised statements. Output sanitization (HTML-escape) on any user-generated content rendered by server responses that carry HTML.

## Scope
**In:**
- Schema per endpoint in the same file as the handler.
- Middleware that runs schema, returns 400 with a stable error shape on mismatch.
- ORM-level assertion that string concatenation of user input is never used to build SQL.
- Angular templates use `{{ }}` interpolation (auto-escaped) throughout; no `innerHTML` bindings in the codebase.

**Out:**
- Cross-service schema registry.

## Radical Simplicity Mandate
- Schemas live next to the handler they protect. No central "schemas" directory.
- No custom validation decorators or reflection.

## ATDD Workflow
1. **RED.** Integration tests: every endpoint returns 400 on a malformed body; grep test that fails CI if any `.raw(` or string-template SQL is present; grep that fails CI if any `innerHTML=` is present in `src/`.
2. **COMMIT:** `test(T-048): add failing validation + injection guards`
3. **GREEN.** Apply.
4. **COMMIT:** `feat(T-048): add server-side validation layer`

## Verification Check
1. **Simpler?** Schema count equals endpoint count; no orphan schemas.
2. **Complete?** CI grep guards pass.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-019 AC1-3)
1. Given any form submission, when processed, then inputs are validated by a server-side schema before persistence.
2. Given user-generated content is rendered, when output, then it is HTML-escaped or sanitized.
3. Given any database query, when executed, then it uses parameterised statements.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
