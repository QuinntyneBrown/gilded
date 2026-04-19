# T-006: Playwright e2e foundation + POM base class

**Traces to:** L1-011, L1-014 (shared infrastructure for every subsequent UI task)
**Depends on:** T-001, T-003
**Est. session:** Small (~2 h)

## Objective
Establish the Playwright test infrastructure that every downstream UI task will hang off. Specs never touch selectors; they go through Page Object classes. Authentication, seeded data, and routing are handled by fixtures so specs read as linear user journeys. After this task, the pattern for writing an e2e is copy-paste-obvious.

## Scope
**In:**
- `e2e/` workspace with `playwright.config.ts` covering Chromium, WebKit, and Firefox at viewport widths 360, 768, 1280.
- Directory layout:
  - `e2e/pages/` — POM classes (`BasePage`, plus `AppShellPage` as the first concrete example).
  - `e2e/flows/` — composite helpers that chain POMs (e.g., `signUpAndVerify(page)`).
  - `e2e/fixtures/` — Playwright fixtures (e.g., `authenticatedPage`, `seededCouple`).
  - `e2e/specs/` — specs that import POMs only.
- `BasePage` contract:
  - `constructor(page: Page)`
  - `goto(path: string): Promise<void>`
  - `expectVisible(): Promise<void>` — abstract; each page asserts its own landmark.
  - Protected helpers for role-based locators; no public locator exposure.
- `AppShellPage` POM with `openSidenav()`, `closeSidenav()`, `clickNavLink(name)`, `isSidenavPinned(): Promise<boolean>`.
- Two example specs:
  - `app-shell.sidenav.spec.ts` — collapse on narrow viewport, pinned on wide viewport.
  - `health.spec.ts` — hits backend `/health` using Playwright's `request` fixture (proves API-only tests share the runner).
- NPM scripts: `e2e`, `e2e:ui`, `e2e:debug`.
- CI job that runs `e2e` in headed=false mode on all three browsers.

**Out:**
- Per-feature POMs — they come in the owning task.
- Visual regression snapshots (defer until a UI task needs them).

## Radical Simplicity Mandate
- `BasePage` must remain under ~30 lines. If it grows, a concrete page is pulling logic up that belongs on itself.
- No bespoke test framework wrapper. No assertion helpers — use `expect` from `@playwright/test` directly.
- No global `before`/`after` hooks that set up domain state; use fixtures.
- Do not create one POM per DOM fragment. One POM per addressable URL.

## Page Object(s)
- `BasePage` (abstract) in `e2e/pages/base.page.ts`.
- `AppShellPage` in `e2e/pages/app-shell.page.ts`.

## ATDD Workflow
1. **RED.** Write `app-shell.sidenav.spec.ts` and `health.spec.ts` importing the not-yet-existing POMs. Specs fail to compile / run.
2. **COMMIT:** `test(T-006): add failing POM specs and fixture contracts`
3. **GREEN.** Author `BasePage`, `AppShellPage`, fixtures, playwright config.
4. **COMMIT:** `feat(T-006): add Playwright e2e foundation with POM pattern`

## Verification Check
1. **Simpler?** Is any POM method a thin wrapper over a single `page.getBy...().click()`? If the method provides zero extra meaning, inline the locator into the POM only if still used once — otherwise justify the method's existence in a domain term.
2. **Complete?** Specs run green on all three browsers at all three viewports in CI.
3. **No temporary code?** No `console.log`, no `.only`, no `.skip`, no `test.fixme`.
4. **No stubs/mocks in prod?** Confirmed — fixtures live under `e2e/fixtures/` only.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria
1. Given a contributor writes an e2e spec, when they import from `e2e/pages/*`, then they can exercise `AppShellPage` end-to-end without referencing raw Playwright `page` APIs in the spec body (other than test orchestration).
2. Given `npm run e2e`, when it runs, then both UI and API-level specs execute under the same runner.
3. Given CI, when a PR is opened, then e2e runs on Chromium, WebKit, and Firefox at 360 / 768 / 1280 viewport widths.
4. Given a spec calls `AppShellPage.openSidenav()` at 360 px, when invoked, then the sidenav is opened; at 1280 px the same call is a no-op because the sidenav is already pinned (covered by a spec assertion).

## Done When
- [ ] Acceptance tests green on all browsers at all viewports in CI.
- [ ] Verification check answered.
- [ ] Two commits recorded.
- [ ] `BasePage` < 30 lines; `AppShellPage` holds only domain methods, no public locator getters.
