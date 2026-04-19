# Gilded

[![CI](https://github.com/QuinntyneBrown/gilded/actions/workflows/ci.yml/badge.svg)](https://github.com/QuinntyneBrown/gilded/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Gilded is an open source web application for Christian couples to discover counsellors, evaluate options together, and manage their journey with private and shared tooling. The repository is built requirements-first: product expectations live in [docs/specs](./docs/specs), implementation slices live in [docs/tasks](./docs/tasks), and every feature is expected to ship with automated acceptance coverage.

> [!IMPORTANT]
> Gilded is in active early-stage development. The current codebase includes foundation work, authentication flows, password reset, and spouse invite/unlink behavior. Counsellor discovery, notes, reviews, shortlist workflows, and production persistence are still in progress.

## Highlights

- Angular 20 frontend with standalone components and Angular Material-only UI enforcement
- TypeScript backend with explicit HTTP handlers for auth and couple workflows
- Node test runner plus Playwright end-to-end coverage
- CI pipeline for typechecking, linting, backend tests, UI lint rules, and browser tests
- Requirements, acceptance criteria, and delivery plan tracked in the repository

## Current Scope

Implemented today:

- account signup with email verification
- login, logout, session lookup, and login rate limiting
- password reset request and completion flows
- spouse invite, accept, and unlink flows
- Angular pages for signup, login, and password reset

Planned next:

- counsellor ingestion, search, and profile experiences
- ratings, reviews, and moderation
- shortlist and appointment-intent workflows
- private, spouse-shared, and public notes
- observability, performance budgets, and account deletion

Current limitations:

- backend data is stored in memory and resets on restart
- SMTP must be configured for real email delivery unless `CAPTURE_EMAILS=1` is enabled
- some routes linked from the app shell are still placeholders on the roadmap

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
| `SMTP_HOST` | No | SMTP host for outbound email delivery. |
| `SMTP_PORT` | No | SMTP port. Defaults to `587`. |
| `SMTP_USER` | No | SMTP username. |
| `SMTP_PASS` | No | SMTP password. |
| `SMTP_FROM` | No | From address for auth and invite emails. Defaults to `noreply@gilded.app`. |
| `CAPTURE_EMAILS` | No | Set to `1` to capture tokens in memory and expose dev-only helper endpoints. |

When `CAPTURE_EMAILS=1` is enabled, local development and E2E flows can inspect:

- `GET /api/dev/last-token?email=<address>`
- `GET /api/dev/user?email=<address>`
- `GET /api/dev/session?sid=<session-id>`
- `GET /api/dev/events`

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run frontend and backend in watch mode. |
| `npm run build` | Build the Angular frontend. |
| `npm run typecheck` | Run frontend and backend type checks. |
| `npm run lint` | Run Angular lint plus backend/E2E ESLint. |
| `npm run lint:ui` | Run Angular lint and SCSS stylelint checks. |
| `npm test` | Run backend tests with the Node test runner. |
| `npm run test:lint` | Run lint-enforcement tests. |
| `npm run e2e` | Run Playwright end-to-end tests. |
| `npm run e2e:ui` | Open Playwright UI mode. |
| `npm run e2e:debug` | Run Playwright in debug mode. |

## Development Model

Gilded is developed in small, vertically sliced tasks. Each task traces back to one or more L2 requirements and follows a red-green-verify loop:

1. write failing acceptance coverage first
2. implement the smallest change that satisfies the requirement
3. review the diff and simplify before moving on

For planned work, use the task files in [docs/tasks](./docs/tasks) as the source of truth. The expected task commit cadence is documented in [docs/tasks/README.md](./docs/tasks/README.md).

## Documentation

- [L1 High-Level Requirements](./docs/specs/L1.md)
- [L2 Detailed Requirements](./docs/specs/L2.md)
- [Implementation Task Plan](./docs/tasks/README.md)
- [Folder Structure](./docs/folder-structure.md)

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request, and follow the expectations in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Support

See [SUPPORT.md](./SUPPORT.md) for help and issue-reporting guidance.

## Security

Please report vulnerabilities according to [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the [MIT License](./LICENSE).
