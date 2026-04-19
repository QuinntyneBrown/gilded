# T-004: `BreakpointObserver`-driven responsive primitives

**Traces to:** L2-017 (L1-011), L2-024 AC11 (L1-016)
**Depends on:** T-002, T-003
**Est. session:** Small (~1 h)

## Objective
Expose a single `LayoutState` stream built on Angular CDK `BreakpointObserver` + Material's `Breakpoints` constants so feature components can react to XS / S / M / L / XL without each one reinventing media queries. Zero custom breakpoint pixel values; Material's constants are authoritative.

## Scope
**In:**
- A standalone injectable (`LayoutState`) that emits `{ viewport: 'xs'|'s'|'m'|'l'|'xl', isHandset: boolean }` using CDK.
- One unit test per emitted viewport mapping.
- Usage example in `AppShellComponent` (replace any inline `BreakpointObserver` wiring added in T-003).

**Out:**
- Any feature-specific layout logic.
- CSS breakpoint helpers — all breakpoint decisions go through this service.

## Radical Simplicity Mandate
- No internal `BehaviorSubject`s when a `map()` on `breakpointObserver.observe([...])` suffices.
- No config object. Breakpoints are literally the five CDK/Material constants.
- No facade layer. Components inject `LayoutState` directly.

## ATDD Workflow
1. **RED.** Unit tests using `fakeAsync` + `BreakpointObserver` fakes assert each emission.
2. **COMMIT:** `test(T-004): add failing LayoutState viewport tests`
3. **GREEN.** Implement the injectable.
4. **COMMIT:** `feat(T-004): add LayoutState responsive primitive`

## Verification Check
1. **Simpler?** Is there a way to do this with fewer operators or without a custom class at all? If a direct `BreakpointObserver.observe()` call is shorter everywhere, delete the class.
2. **Complete?** Covers XS through XL.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity check green?**

## Acceptance Criteria (from L2-024 AC11, L2-017)
- All breakpoint decisions use CDK `BreakpointObserver` + Material `Breakpoints` constants.
- No custom media-query pixel values anywhere in the app.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
- [ ] No `@media (min-width: ...)` literals outside `_theme.scss`.
