# T-001: Project scaffolding (Angular + backend)

**Traces to:** L1-011, L1-012, L1-014, L1-016
**Depends on:** —
**Est. session:** Small (~2 h)

## Objective
Stand up the repository as a working Angular 17+ application plus a backend skeleton, both able to run locally, produce a failing healthcheck test, and a passing healthcheck test once the endpoint exists. No feature code, no ceremony. Everything downstream assumes this exists.

## Scope
**In:**
- Angular 17+ workspace (`ng new` with standalone components, Sass, strict TS, routing enabled).
- Backend skeleton (a single HTTP service exposing `GET /health` returning `{"status":"ok"}`).
- `@playwright/test` installed; one e2e spec that hits the frontend and the `/health` endpoint. (The full POM foundation is T-006 — this task only installs Playwright and writes the healthcheck spec.)
- Unified `npm run dev` script that starts both concurrently.
- README snippet with `dev`, `test`, `lint` commands only.

**Out:**
- Any feature UI, auth, database, counsellor model, Material theme (T-002 handles that).
- Docker, deploy pipelines, infra-as-code.

## Radical Simplicity Mandate
- One package manager. One build tool per app. No monorepo framework until a second app actually exists.
- No custom wrappers around `ng`, `ng serve`, or the backend runtime.
- No configuration files beyond what the generators emit.
- If a default value works, do not override it.
- Zero abstraction layers between `/health` and the handler.

## ATDD Workflow
1. **RED.** Add an e2e that asserts `GET /health` returns 200 with `{"status":"ok"}` and that the Angular app renders at `/`. Confirm it fails because neither runs yet.
2. **COMMIT:** `test(T-001): add failing healthcheck and app-renders e2e`
3. **GREEN.** Generate Angular workspace, generate backend skeleton, wire `/health`.
4. **COMMIT:** `feat(T-001): scaffold Angular app and backend healthcheck`

## Verification Check (answer in writing before closing)
1. **Simpler?** Is any file longer than it has to be? Remove any boilerplate the generator added that no task requires yet (e.g., unused karma config if Jest is chosen, unused polyfill entries).
2. **Complete?** Do `npm run dev`, `npm test`, and the e2e all pass from a fresh clone?
3. **No temporary code?** `git grep -E "TODO|FIXME|stub|mock|temporary|placeholder"` returns nothing from non-test files.
4. **No stubs/mocks in prod code?** Confirmed.
5. **All tests pass locally?**
6. **Lint + typecheck green?**

## Acceptance Criteria
1. Given a fresh clone, when a developer runs `npm install && npm run dev`, then both the Angular app and the backend start with no errors.
2. Given both services are running, when the e2e suite runs, then it passes including the healthcheck assertion.
3. Given the repo, when `npm run lint` and `npm run typecheck` are invoked, then both exit 0.

## Verification Check
1. **Simpler?** No file is longer than it needs to be. Placeholder template removed. Backend is minimal Node.js http — no framework.
2. **Complete?** `npm run dev`, `npm test`, and the e2e pass from a fresh clone after `npm install`.
3. **No temporary code?** Confirmed — no TODO/FIXME/stub/mock/placeholder in production code.
4. **No stubs/mocks in prod code?** Confirmed. Mocks only in test files.
5. **All tests pass locally?** Yes — backend unit test and e2e healthcheck green.
6. **Lint + typecheck green?** Yes — `npm run lint` and `npm run typecheck` both exit 0.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered in writing.
- [x] Two commits on record (RED, GREEN), or three if a simplify pass occurred.
- [x] No TODO / stub / mock / placeholder in production code.
