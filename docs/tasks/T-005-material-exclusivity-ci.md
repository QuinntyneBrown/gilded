# T-005: CI lint rules that enforce Material-only UI

**Traces to:** L2-024 AC10 (L1-016)
**Depends on:** T-001, T-002
**Est. session:** Small (~2 h)

## Objective
Automate the enforcement of L2-024 so no PR can merge that sneaks in a raw `<button>`, a hex color literal, or a hand-declared `font-size`. The build fails before a human reviews it.

## Scope
**In:**
- ESLint rule (custom or `@angular-eslint/template/no-`-style) that fails on bare `<button>`, `<input>`, `<select>`, `<textarea>` in `.html` templates unless they carry a Material directive (`mat-button`, `matInput`, `mat-select`, etc.).
- Stylelint rule set that forbids `color`/`background`/`border-color`/`font-family`/`font-size`/`font-weight`/`line-height` literals outside `src/styles/_theme.scss`.
- npm script `lint:ui` that runs both rule sets.
- CI step that runs `lint:ui` and fails the build on any violation.

**Out:**
- Runtime checks. This is build-time only.

## Radical Simplicity Mandate
- Prefer off-the-shelf stylelint plugins (`stylelint-declaration-strict-value`, `stylelint-no-color-literals`) over hand-written rules.
- If an existing ESLint plugin rule covers the template check, use it. Only author a custom rule if none fits.
- One config file per linter. No shared "lint config" package.

## ATDD Workflow
1. **RED.** Add fixture files that contain a bare `<button>`, a `color: #ff0000`, and a `font-size: 14px`. Add a test that runs `lint:ui` and expects it to exit non-zero with at least three diagnostics.
2. **COMMIT:** `test(T-005): add failing Material-exclusivity lint test`
3. **GREEN.** Configure rules until the fixtures fail linting and the project itself passes.
4. **COMMIT:** `feat(T-005): enforce Material-exclusivity at lint time`

## Verification Check
1. **Simpler?** Is the rule list minimal? Remove any rule not proving its worth against the fixtures.
2. **Complete?** Running `lint:ui` on the current repo passes; on the fixtures, fails.
3. **No temporary code?** Fixture files live under `tests/lint-fixtures/`, never imported by production code.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green on production source?**

## Acceptance Criteria (from L2-024 AC10)
- CI fails when raw `<button>` / `<input>` / `<select>` / `<textarea>` appear in templates without a Material directive.
- CI fails when color literals appear outside the theme file.
- CI fails when typography properties are declared outside the theme file.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
- [ ] `lint:ui` wired into CI pipeline.
