# Repository Folder Structure

This document describes the expected top-level folder structure for the `gilded` repository. The project is a full-stack application with an Angular frontend, a backend API, and Playwright end-to-end tests.

## Top-level layout

```
gilded/
├── .github/                  # GitHub Actions workflows, issue/PR templates
├── .vscode/                  # Shared editor settings, launch configs, tasks
├── docs/                     # Project documentation (specs, tasks, ADRs, designs)
│   ├── specs/                # L1/L2 requirements specifications
│   ├── tasks/                # T-### task breakdowns
│   ├── adr/                  # Architecture Decision Records
│   └── folder-structure.md   # This document
├── frontend/                 # Angular application (see "Frontend" below)
├── backend/                  # Backend API (see "Backend" below)
├── e2e/                      # Playwright end-to-end tests (see "E2E" below)
├── public/                   # Static assets served by the frontend
├── scripts/                  # Dev/build/deploy helper scripts
├── .editorconfig
├── .gitignore
├── eslint.config.js          # Shared ESLint config (frontend + backend + e2e)
├── package.json              # Root workspace manifest (orchestrates all three)
├── playwright.config.ts      # Playwright config (at root so webServer can start both stacks)
└── README.md
```

## Frontend (`frontend/`)

Angular application. All Angular-specific config (`angular.json`, `tsconfig*.json`, `src/`, `public/`) lives under `frontend/`. Feature-first structure with shared primitives isolated in `core/` and `shared/`.

```
frontend/
├── angular.json              # Angular workspace config
├── tsconfig.json             # Base TS config for the Angular app
├── tsconfig.app.json
├── tsconfig.spec.json
├── public/                   # Static assets copied into the build
└── src/
    ├── app/
    │   ├── core/             # Singleton services, guards, interceptors, models
    │   │   ├── auth/
    │   │   ├── http/
    │   │   └── config/
    │   ├── shared/           # Reusable components, directives, pipes
    │   │   ├── components/
    │   │   ├── directives/
    │   │   └── pipes/
    │   ├── features/         # Feature modules / routed areas
    │   │   ├── auth/         # signup, login, password reset
    │   │   ├── spouse/       # spouse invite / link / unlink
    │   │   ├── counsellors/  # search, profile, add, ratings, reviews
    │   │   ├── shortlist/    # shortlist + comparison
    │   │   ├── notes/        # private / spouse / public notes
    │   │   └── account/      # settings, deletion
    │   ├── layout/           # app shell, nav, header, footer
    │   ├── app.config.ts
    │   ├── app.routes.ts
    │   ├── app.html
    │   ├── app.scss
    │   └── app.ts
    ├── assets/               # Images, fonts, i18n
    ├── styles/               # Global styles, theme, design tokens
    ├── environments/         # environment.ts, environment.prod.ts
    ├── index.html
    ├── main.ts
    └── styles.scss
```

**Conventions**
- One feature per folder under `features/`, with its own routes, components, and services.
- `core/` holds singletons loaded once at app start; never imported by feature modules.
- `shared/` is stateless and safe to import anywhere.
- Unit tests live alongside the file under test as `*.spec.ts`.

## Backend (`backend/`)

Backend API. Layered structure separating HTTP transport, application logic, domain, and infrastructure.

```
backend/
└── src/
    ├── api/                  # HTTP layer: controllers/routes, DTOs, validators
    │   ├── auth/
    │   ├── counsellors/
    │   ├── ratings/
    │   ├── reviews/
    │   ├── notes/
    │   └── shortlist/
    ├── application/          # Use cases / command + query handlers
    ├── domain/               # Entities, value objects, domain services
    │   ├── user/
    │   ├── counsellor/
    │   ├── review/
    │   └── note/
    ├── infrastructure/       # DB, email, geocoding, storage, external adapters
    │   ├── db/
    │   │   ├── migrations/
    │   │   └── seed/
    │   ├── email/
    │   ├── geocoding/
    │   └── storage/
    ├── middleware/           # Auth, rate limiting, logging, error handling
    ├── config/               # Env parsing, feature flags
    ├── lib/                  # Cross-cutting helpers (crypto, logging, metrics)
    └── main.ts               # App entry point
└── tests/                    # Backend unit + integration tests
    ├── unit/
    └── integration/
```

**Conventions**
- Domain layer has no dependencies on `api/` or `infrastructure/`.
- Migrations are append-only and numbered.
- Integration tests hit a real database, not mocks.

## End-to-End Tests (`e2e/`)

Playwright tests driving the full stack through the browser. Organized by user journey, with a Page Object Model (POM) foundation.

```
e2e/
├── pages/                    # Page Object Model classes
│   ├── base.page.ts
│   ├── auth/
│   │   ├── signup.page.ts
│   │   └── login.page.ts
│   ├── counsellors/
│   │   ├── search.page.ts
│   │   └── profile.page.ts
│   └── notes/
├── fixtures/                 # Playwright fixtures (auth state, seeded users)
├── specs/                    # Test specs grouped by journey
│   ├── auth/
│   ├── spouse/
│   ├── counsellor-discovery/
│   ├── ratings-reviews/
│   ├── shortlist-comparison/
│   ├── notes/
│   └── golden-journeys/      # End-to-end happy-path journeys (T-054)
├── support/                  # Helpers: API seeding, test data builders
├── health.spec.ts            # Smoke test: frontend + backend reachable
└── playwright.config.ts      # (or at repo root)
```

**Conventions**
- Every page has a POM class under `pages/`; specs never use raw selectors.
- Seeded test data is created via API helpers in `support/`, not through UI.
- Golden journeys exercise full user flows end-to-end and gate releases.

## Rationale

- **Separation of concerns**: `frontend/`, `backend/`, and `e2e/` live side-by-side so a single clone gives the full system, but each is independently buildable.
- **Feature-first frontend**: features are colocated (components, services, routes) so work on one area touches one folder.
- **Layered backend**: domain logic is insulated from transport and infrastructure, keeping it testable without spinning up the whole stack.
- **POM-based e2e**: selectors live in one place per page so UI refactors don't cascade into every spec.
