# Contributing to Nova

Thank you for helping improve Nova. The project is a TypeScript monorepo for a local-first Electron desktop agent, and behavioral changes are expected to remain aligned with the normative documentation under `docs/`.

## Development setup

Use Node.js 22 or a compatible modern Node.js release and pnpm 9.15.5.

```bash
git clone https://github.com/vincenzo-afk/Nova-test.git
cd Nova-test
pnpm install --frozen-lockfile
```

## Verification before a change is proposed

Run the complete repository verification suite and the desktop production build:

```bash
pnpm verify
pnpm --filter @nova/desktop build
```

The verification suite covers documentation-link validation, formatting, ESLint, recursive TypeScript typechecking, Prisma test preparation, shared-package compilation, and Vitest. If a change affects a service contract, add or update focused tests and an integration test where a service boundary is involved.

## Development conventions

Keep cross-service contracts in `packages/shared`. Use the stable error-code catalog for public errors and rebuild the shared package before consuming a newly added code. Preserve strict TypeScript settings, context isolation, explicit permission gates, workspace scoping, correlation identifiers, and deterministic behavior in tests.

Follow the documented milestone order and treat the relevant specification files as the source of truth. If a specification is ambiguous, record the ambiguity rather than silently inventing behavior. Avoid committing generated Prisma clients, build output, database files, environment files, credentials, or access tokens.

## Branches and commits

Use a focused branch name such as `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`, `test/<short-name>`, or `chore/<short-name>`. Use concise Conventional Commit subjects such as:

- `feat: add capability`
- `fix: correct boundary behavior`
- `test: cover recovery path`
- `docs: clarify runtime contract`
- `chore: update tooling`

## Pull requests

A pull request should explain the intent, affected packages, specification references, tests run, documentation changes, and any security or compatibility impact. Keep unrelated refactors separate. Include screenshots when changing the Electron renderer, and describe any platform-specific verification that could not be run locally.

The repository is maintained by a solo maintainer. Pull requests are reviewed for correctness and maintainability, but a second approval is not required by the repository’s current workflow.

## Reporting issues

Use the repository issue forms for reproducible bugs and focused feature proposals. Include the commit, operating system, Node.js and pnpm versions, exact command, expected behavior, actual behavior, and relevant sanitized logs. Do not include secrets or private user data.
