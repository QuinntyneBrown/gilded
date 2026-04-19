# T-003: App shell with MatToolbar + MatSidenav

**Traces to:** L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-002
**Est. session:** Small (~1.5 h)

## Objective
Build the always-on application chrome: a `MatToolbar` header, a `MatSidenav` nav, and a routed content outlet. Mobile breakpoints collapse the sidenav behind a hamburger; larger breakpoints pin it open. No feature pages yet — just a placeholder route.

## Scope
**In:**
- Standalone `AppShellComponent` using `MatToolbar`, `MatSidenav`, `MatSidenavContent`, `MatNavList`, `MatIcon`.
- Brand title rendered with `mat-headline-6` typography.
- Nav links present but inert until features exist (link targets: `/search`, `/shortlist`, `/notes`).
- `<router-outlet>` inside the content area.

**Out:**
- Any page content. Authentication awareness (added in T-013 and later).
- Dark-mode toggle UI (T-002 enables the plumbing; toggle lives with user settings later).

## Radical Simplicity Mandate
- No service to track "is sidenav open". Use `BreakpointObserver` directly in the component or the CDK `Breakpoints` map. No bespoke layout service.
- No custom directives on `<mat-toolbar>` or `<mat-sidenav>`. No wrapper components.
- One template. One SCSS file. No shared "shell" module.

## ATDD Workflow
1. **RED.** Component test: renders toolbar, renders sidenav, viewport width 360px shows hamburger + closed sidenav, viewport >=1200px shows pinned sidenav.
2. **COMMIT:** `test(T-003): add failing app shell tests`
3. **GREEN.** Author shell, wire `BreakpointObserver`, route placeholder page.
4. **COMMIT:** `feat(T-003): add app shell with toolbar and sidenav`

## Verification Check
1. **Simpler?** Can any template block be removed? Any `@Input()` that is not used?
2. **Complete?** Passes at 360 / 576 / 768 / 992 / 1200 / 1440 widths — no horizontal scroll.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity lint (T-005) green?**

## Acceptance Criteria (from L2-024 AC3, L2-017 AC1-2)
- Top bar uses `MatToolbar`; side nav uses `MatSidenav` + `MatNavList`.
- Viewport < 576px: single column, hamburger to open sidenav, tap targets >= 44x44 px.
- Viewports 576 / 768 / 992 / 1200: no horizontal scroll, no clipped content.

## Done When
- [ ] Acceptance tests green at all required breakpoints.
- [ ] Verification check answered.
- [ ] Two commits recorded.
- [ ] Zero raw HTML buttons or custom icons in shell template.
