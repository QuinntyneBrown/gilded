# Gilded

[![CI](https://github.com/QuinntyneBrown/gilded/actions/workflows/ci.yml/badge.svg)](https://github.com/QuinntyneBrown/gilded/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Gilded is an open source web application for Christian couples to discover counsellors, evaluate options together, and manage their journey with private and shared tooling. The repository is built requirements-first: product expectations live in [docs/specs](./docs/specs), implementation slices live in [docs/tasks](./docs/tasks), and every feature is expected to ship with automated acceptance coverage.

> [!IMPORTANT]
> Gilded is code complete against the current requirements set in [docs/specs/L1.md](./docs/specs/L1.md) and [docs/specs/L2.md](./docs/specs/L2.md). The repository includes the full planned feature set, acceptance coverage, production build scripts, and Azure deployment packaging. The main remaining architectural gap is durable persistence: core domain data still lives in memory unless a real datastore is introduced.

## Highlights

- Angular 20 frontend with standalone components and Angular Material-only UI enforcement
- TypeScript backend covering auth, couples, counsellor discovery, moderation, shortlist, appointment intent, notes, account deletion, metrics, and structured logging
- Node test runner plus Playwright acceptance coverage for both UI flows and API-level behavior
- CI pipeline for typechecking, linting, backend tests, UI lint rules, accessibility checks, performance budgets, and browser tests
- Requirements, acceptance criteria, and implementation history tracked in the repository

## Feature Set

Implemented in the current codebase:

- account signup with email verification, secure login/logout, password reset, session lookup, and account deletion
- couple invite, accept, unlink, shortlist merge, chosen-counsellor notifications, and appointment-intent tracking
- counsellor seeding, ingestion, manual submission, moderation, proximity search, profile pages, and photo upload
- ratings, reviews, comments, moderation rules, and reviewer abuse controls
- private, spouse-shared, and public notes with encryption-at-rest and IDOR coverage
- responsive Angular Material UI for auth, search, profile, shortlist, notes, moderation, and spouse-management flows
- structured request logging, Prometheus-style metrics, accessibility checks, and performance-budget coverage

Current limitations:

- backend data is stored in memory and resets on restart
- uploaded counsellor photos use local filesystem storage unless `PHOTO_DIR` is configured
- SMTP must be configured for real email delivery unless `CAPTURE_EMAILS=1` is enabled
- geocoding, CAPTCHA verification, and protected metrics require environment-specific configuration to operate beyond local defaults

## Repository Layout

```text
backend/              TypeScript HTTP service, domain logic, and its workspace manifest
docs/specs/           L1 and L2 product requirements
docs/tasks/           Vertically sliced implementation plan
e2e/                  Playwright page objects and end-to-end specs
frontend/             Angular 20 application and its workspace manifest
tests/                Lint enforcement tests and fixtures
```

## Quick Start

### Prerequisites

- Node.js 24.x
- npm 10+

### Install

```bash
npm ci
```

The root `package.json` orchestrates the workspaces and shared tooling. App-specific dependencies now live in `frontend/package.json` and `backend/package.json`.

### Run locally

```bash
npm run dev
```

This starts:

- the frontend at `http://localhost:4200`
- the backend at `http://localhost:3000`

The Angular dev server proxies `/api` requests to the backend via [frontend/proxy.conf.json](./frontend/proxy.conf.json).

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_URL` | No | Base URL used in email links. Defaults to `http://localhost:4200`. |
| `PORT` | No | HTTP port for the backend. Defaults to `3000`, but Azure App Service injects its own value. |
| `CLIENT_DIST_DIR` | No | Overrides the frontend build directory the backend serves in production. |
| `PHOTO_DIR` | No | Directory used for uploaded counsellor photos. Defaults to the OS temp directory. |
| `NOTE_MASTER_KEY` | No | 64-character key used for note encryption. A development fallback is used when unset. |
| `SMTP_HOST` | No | SMTP host for outbound email delivery. |
| `SMTP_PORT` | No | SMTP port. Defaults to `587`. |
| `SMTP_USER` | No | SMTP username. |
| `SMTP_PASS` | No | SMTP password. |
| `SMTP_FROM` | No | From address for auth and invite emails. Defaults to `noreply@gilded.app`. |
| `GEOCODING_API_KEY` | No | Enables postal-code geocoding for counsellor distance search. |
| `TURNSTILE_SECRET_KEY` | No | Enables server-side Cloudflare Turnstile verification for signup and review creation. |
| `CAPTCHA_DISABLED` | No | Set to `1` to bypass CAPTCHA checks even when a Turnstile secret is present. |
| `METRICS_TOKEN` | No | Optional token required to access `GET /metrics`. |
| `CAPTURE_EMAILS` | No | Set to `1` to capture tokens in memory and expose dev-only helper endpoints. |

When `CAPTURE_EMAILS=1` is enabled, local development and E2E flows can inspect:

- `GET /api/dev/last-token?email=<address>`
- `GET /api/dev/user?email=<address>`
- `GET /api/dev/session?sid=<session-id>`
- `GET /api/dev/events`

## Scripts

| Command | Description |
| --- | --- |
| `npm run seed:counsellors` | Seed counsellors from the bundled Mississauga source file. |
| `npm run ingest:counsellors` | Run the ingestion script against an external counsellor source. |
| `npm run dev` | Run frontend and backend in watch mode. |
| `npm run build` | Build the Angular frontend. |
| `npm run build:frontend` | Build the Angular frontend explicitly. |
| `npm run build:backend` | Compile the backend into `backend/dist` for production deployment. |
| `npm run package:azure` | Assemble the Azure App Service artifact in `.artifacts/azure-webapp`. |
| `npm run build:azure` | Build the frontend and backend, then assemble the Azure App Service artifact in `.artifacts/azure-webapp`. |
| `npm run typecheck` | Run frontend and backend type checks. |
| `npm run lint` | Run Angular lint plus backend/E2E ESLint. |
| `npm run lint:ui` | Run Angular lint and SCSS stylelint checks. |
| `npm test` | Run backend tests with the Node test runner. |
| `npm run test:lint` | Run lint-enforcement tests. |
| `npm run e2e` | Run Playwright end-to-end tests. |
| `npm run e2e:perf` | Run the Playwright performance-budget project. |
| `npm run e2e:ui` | Open Playwright UI mode. |
| `npm run e2e:debug` | Run Playwright in debug mode. |
| `npm run perf:load` | Run the repository load-test script. |

## Development Model

Gilded was built in small, vertically sliced tasks. Each task traces back to one or more L2 requirements and follows a red-green-verify loop:

1. write failing acceptance coverage first
2. implement the smallest change that satisfies the requirement
3. review the diff and simplify before moving on

The task files in [docs/tasks](./docs/tasks) remain the source of truth for requirement traceability and delivery history. Future changes should preserve the same red-green-verify cadence documented in [docs/tasks/README.md](./docs/tasks/README.md).

## Documentation

- [L1 High-Level Requirements](./docs/specs/L1.md)
- [L2 Detailed Requirements](./docs/specs/L2.md)
- [Implementation Task Plan](./docs/tasks/README.md)
- [Folder Structure](./docs/folder-structure.md)
- [Azure Cheapest Deployment Plan](./docs/azure-cheapest-deployment-plan.md)

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request, and follow the expectations in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Support

See [SUPPORT.md](./SUPPORT.md) for help and issue-reporting guidance.

## Security

Please report vulnerabilities according to [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the [MIT License](./LICENSE).
