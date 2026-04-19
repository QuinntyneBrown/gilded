# Contributing to Gilded

Thanks for contributing to Gilded.

This repository is intentionally requirements-driven. Before proposing code, read:

- [docs/specs/L1.md](./docs/specs/L1.md)
- [docs/specs/L2.md](./docs/specs/L2.md)
- [docs/tasks/README.md](./docs/tasks/README.md)

## Ground Rules

- Keep solutions simple. Prefer direct code over speculative abstractions.
- Match the Angular Material-only UI standard defined in `L1-016` and `L2-024`.
- Do not leave production TODOs, placeholders, dead code, or stubs behind.
- Keep changes small, focused, and traceable to a requirement or clearly stated goal.
- Do not mix unrelated cleanup into a pull request.

## Development Setup

Prerequisites:

- Node.js 24.x
- npm 10+

Install dependencies:

```bash
npm ci
```

Run the application locally:

```bash
npm run dev
```

Optional environment variables:

- `APP_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `CAPTURE_EMAILS=1` for local token capture during auth and invite flows

## Workflow

If you are implementing planned product work, use the matching task file in
[docs/tasks](./docs/tasks) as the source of truth.

Expected implementation flow:

1. Write failing acceptance coverage first.
2. Implement the smallest change that makes the tests pass.
3. Re-read the diff and simplify before opening a pull request.

Preferred commit style for task work:

- `test(T-XXX): add failing acceptance tests for L2-XXX`
- `feat(T-XXX): implement L2-XXX`
- `refactor(T-XXX): simplify`

For documentation or maintenance work, use short descriptive commits such as
`docs: add community health files`.

## Quality Gate

Before opening a pull request, run:

- `npm run typecheck`
- `npm run lint`
- `npm run lint:ui`
- `npm test`
- `npm run test:lint`
- `npm run e2e`

If your change does not need one of these commands, explain why in the pull
request.

## Pull Requests

- Keep each pull request single-purpose.
- Reference the relevant requirement or task file in the description.
- Summarize the behavior change, risk, and any follow-up work.
- Include screenshots for UI changes.
- Update documentation when setup, commands, or behavior changes.

## Issues and Questions

Use GitHub Issues for bug reports, enhancement requests, and usage questions.
For security issues, do not open a public issue; follow
[SECURITY.md](./SECURITY.md) instead.
