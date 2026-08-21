# Technology Lock

## Purpose

The single, consolidated registry of every **Required** — machine-hard,
no-negotiation — decision that affects code generation. Despite the
filename (kept for continuity with the requested governance-folder
structure), this file's table is intentionally broader than "which
libraries": it is the one place an AI agent checks to find out that a
given decision is locked, at all, before treating it as open. Every row
links to the document with the full rationale and detail; this file's
job is to make the *fact of being locked* impossible to miss or
soft-pedal into a "preference."

## Scope

Every category of decision that shapes generated code: language,
runtime, framework, database, ORM, queue, cache, validation, routing,
state management, event format, error format, versioning policy, retry
policy, and concurrency policy — plus the deployable-surface stack
detail. If a decision affects what code gets generated and it isn't in
this table, that is itself a gap — see `ambiguity-policy.md`.

## The lock (stack)

| Layer | Locked choice |
|---|---|
| Desktop UI language | TypeScript 5.x, strict mode |
| Desktop UI framework | React 19 |
| Desktop shell | Electron (`contextIsolation: true`, no renderer Node integration) |
| Desktop bundler | Vite |
| Desktop styling | Tailwind CSS 4 |
| Backend language/runtime | TypeScript / Node.js 22 |
| Backend service framework | Fastify |
| Validation | Zod |
| ORM | Prisma |
| Primary database | SQLite (local-first default) / PostgreSQL (shared deployment) |
| Cache / queue | Redis / BullMQ |
| Routing | React Router |
| Android language | Kotlin, Jetpack Compose, Gradle |
| CLI language/runtime | TypeScript / Node.js 22, shared types with core services |
| Package manager | pnpm (workspaces) |
| Testing | Vitest (unit), Playwright (E2E) |
| Linting/formatting | ESLint, Prettier |

Full detail and rationale: `docs/14-development/technology-stack.md`.

## The lock (cross-cutting policy)

| Decision | Locked choice | Canonical detail |
|---|---|---|
| State management | TanStack Query (server/async), `useState`/`useReducer` (local), Context (cross-component, kept small) — no Redux/Zustand/Jotai/Signals | `docs/14-development/library-and-pattern-rules.md`, `canonical-patterns.md` |
| Event format | Fixed envelope (`message_id`, `type`, `payload`, `published_at`, `priority`, `version`); at-least-once delivery, consumer idempotency required by default | `docs/26-system-reference/07-event-catalog.md`, `docs/26-system-reference/17-event-and-internal-api-contracts.md` |
| Error format | Result pattern (`{ ok, value }` / `{ ok: false, error }`) for expected failures; exceptions reserved for unexpected/non-recoverable conditions; every error carries a stable code from the error catalog | `docs/14-development/error-handling-tagging-and-performance-rules.md`, `docs/26-system-reference/06-error-catalog.md` |
| Versioning policy | Additive-only within a major version; breaking change = new major version + ADR + deprecation window, for every artifact type (schemas, events, plugins, APIs, memory, config, agents) | `docs/26-system-reference/20-versioning-contracts.md` |
| Retry policy | Max 3 retries, exponential backoff (base 500ms, ×2), ±20% jitter, circuit breaker after 5 consecutive failures (60s open) | `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md` |
| Concurrency policy | Planner/Verifier/Indexer/Search/Memory-reads run concurrently by default; Executor steps with overlapping locks serialize; plugins isolated and never block core | `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md` |

None of the six rows above are "Preferred" — every one is Required per
`decision-authority-matrix.md`'s classification framework. A change that
deviates from any row in either table above needs an ADR
(`docs/15-decisions/`) before it is written, not after.

## Rule

**No substitutions. No alternatives.** A proposal to use a different
language, framework, database, package manager, state-management
approach, event/error format, or retry/concurrency/versioning policy
anywhere in either table above is out of scope for a normal PR. It
requires an ADR (`docs/15-decisions/`) approved by a human before any
code using the alternative is written — see `forbidden-decisions.md`.

## Full detail

`docs/14-development/technology-stack.md` — per-surface breakdown,
monorepo file structure, and the rationale for each stack choice (e.g.,
why SQLite for local-first rather than a separate graph database). The
"Canonical detail" column above links each policy row to its full
specification.

Adding something new to either table above (rather than looking one up)
is `docs/14-development/dependency-policy.md`'s process, not this file's
— this file is the registry of outcomes, that one is the process that
produces them.

