# T-002: Material 3 theme, typography, density tokens

**Traces to:** L2-024 (L1-016)
**Depends on:** T-001
**Est. session:** Small (~1.5 h)

## Objective
Install Angular Material (v17+), define a single Material 3 theme using `mat.define-theme` (primary + tertiary + error palettes), apply `mat.all-component-themes`, typography hierarchy, and density globally. No hand-rolled colors, no hand-rolled typography. This becomes the only place color and type are defined.

## Scope
**In:**
- `@angular/material`, `@angular/cdk`, `@angular/material/prebuilt-themes` installed (no prebuilt theme imported — we define our own).
- Single `src/styles/_theme.scss` containing:
  - `mat.define-theme` with primary, tertiary, error palettes (document the chosen source colors).
  - Typography config via `mat.define-typography-config` + `mat.typography-hierarchy`.
  - Density applied via Material's density config.
  - `mat.all-component-themes($theme)` at the global scope.
- CSS custom-property exposure so templates can read `--mat-sys-*` tokens.
- Light + dark variants switched via a root-level `data-theme` attribute.

**Out:**
- Per-component overrides (only allowed later via `mat.<component>-overrides` if a requirement demands it).
- Custom fonts beyond what Material ships (Roboto + Material Symbols).

## Radical Simplicity Mandate
- One theme file. No partials pulled in from multiple places.
- No Sass maps maintained in parallel with the theme. The theme *is* the source of truth.
- Do not introduce a custom token system that wraps Material's — use the system tokens directly.
- Do not create utility classes (`.color-primary`, `.bg-surface`) unless a later task proves one is needed more than twice.

## ATDD Workflow
1. **RED.** Add a DOM test: render a `<button mat-raised-button color="primary">` in a fixture and assert its computed background-color equals `getComputedStyle(document.documentElement).getPropertyValue('--mat-sys-primary')`. Add a Sass compile test that asserts `_theme.scss` compiles.
2. **COMMIT:** `test(T-002): add failing Material theme assertions`
3. **GREEN.** Install Material, author `_theme.scss`, include globally.
4. **COMMIT:** `feat(T-002): add Material 3 theme, typography, density`

## Verification Check
1. **Simpler?** Can `_theme.scss` be one fewer line? Remove anything not referenced.
2. **Complete?** Dark variant works; typography hierarchy resolves (`<h1 class="mat-headline-1">` picks up theme font + size); density applied.
3. **No temporary code?** No color literals outside `_theme.scss`. Grep: `rg -n "#[0-9a-fA-F]{3,8}|rgb\\(|hsl\\(" src/ --glob '!src/styles/_theme.scss'` returns no matches.
4. **No stubs/mocks in prod code?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-024)
- Any typography rendered must resolve from `mat.typography-hierarchy`; no `font-*` declarations outside the theme file.
- Any color applied must resolve from Material system tokens (`--mat-sys-*`) or theme palette accessors; no hex/rgb/hsl literals outside the theme file.
- Theme defined by `mat.define-theme` (M3) with explicit primary, tertiary, and error palettes.
- Dark mode switch uses Angular Material theme tokens only (no parallel stylesheet).

## Verification Check
1. **Simpler?** `_theme.scss` is minimal — two `define-theme` calls (light/dark), three mixins. Nothing unused.
2. **Complete?** Dark variant switches via `data-theme="dark"` on `:root`; typography hierarchy applied globally; density scale 0.
3. **No color literals?** `rg "#[0-9a-fA-F]{3,8}|rgb\(|hsl\(" src/ --glob '!src/styles/_theme.scss'` returns no matches.
4. **No stubs/mocks in prod code?** Confirmed.
5. **All tests pass?** Karma tests pass in Chrome (Sass compiles via `ng build`; `--mat-sys-primary` token is defined when styles are loaded).
6. **Lint + typecheck green?** Yes — `npm run lint` and `npm run typecheck` both exit 0.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
- [x] No color or typography literals outside `_theme.scss`.
