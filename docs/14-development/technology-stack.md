# Technology Stack (Locked)

## Status: full detail — summary lives in the governance folder

`docs/00-implementation-governance/technology-lock.md` is the short,
first-read summary of this document's content and is what
`ai-constitution.md` and `code-generation-rules.md` point to first. This
file is the complete detail behind that summary — every choice, every
piece of rationale. If the two ever disagree, this file's content is
correct and the governance-folder summary is stale; fix the summary to
match this file in the same change, per
`docs/00-implementation-governance/documentation-precedence.md`. Neither
file is a second independent source of the *decision* — the decision is
made once, here, and summarized there.

## Purpose

The definitive, non-negotiable technology choices for NOVA, per Sections
1 through 4 of the second master outline. No AI agent or contributor
substitutes, adds, or "improves on" any choice below without an ADR
(`docs/15-decisions/`) — a stack decision made silently in a PR is
treated as a process violation regardless of whether the substitution
was technically reasonable. This is the concrete instantiation of
`ai-decision-authority.md`'s "AI MUST NEVER decide" list for this
specific project.

## Scope

The monorepo's language, framework, runtime, database, and file-layout
choices across every deployable surface (Desktop, Android companion,
CLI, core runtime services). Component *behavior* is specified
elsewhere; this document is only the "what it's built with."

## Frontend (Desktop UI — `docs/09-ui/`)

- **Language:** TypeScript 5.x, strict mode, no exceptions.
- **Framework:** React 19.
- **Desktop shell:** Electron, with `contextIsolation: true` and no
  Node integration in the renderer — all privileged calls cross the IPC
  boundary defined in `docs/02-architecture/ipc-mechanisms.md`.
- **Bundler:** Vite.
- **Styling:** Tailwind CSS 4.
- **Icons:** Lucide.
- **Animation:** Motion.
- **Routing:** React Router.
- **Package manager:** pnpm (workspaces).
- **Testing:** Vitest (unit), Playwright (E2E, including tray/overlay
  interaction per `docs/09-ui/tray.md` and `docs/09-ui/overlay.md`).
- **Linting/formatting:** ESLint, Prettier.

No substitutions, no alternatives — a proposal to use Vue, Svelte, Redux,
webpack, or any other framework/tool in this layer is out of scope for a
normal PR and requires an ADR.

## Backend / Core Runtime Services (`docs/03-runtime/`, `docs/05-ai/`)

- **Language:** TypeScript.
- **Runtime:** Node.js 22 (LTS).
- **Internal service framework:** Fastify, for any process exposing an
  HTTP/internal-API surface (`docs/08-api/internal-api.md`).
- **Validation:** Zod, for every schema boundary (tool I/O, internal
  API, event payloads).
- **ORM:** Prisma.
- **Job/queue:** BullMQ, backed by Redis, for any work that must survive
  a process restart and isn't already covered by the event bus.
- **Cache:** Redis.
- **Primary database:** PostgreSQL for any deployment topology with a
  shared/server component (e.g., a self-hosted multi-user configuration);
  the default local-first single-user deployment uses embedded SQLite
  (via Prisma's SQLite provider) instead — see `docs/13-devops/storage-layout.md`
  for which topology applies to a given install.

## Memory / Knowledge Graph Storage (`docs/04-memory/`)

- **Graph + relational storage:** SQLite (local-first default) /
  PostgreSQL (shared-deployment default), same ORM (Prisma) as the rest
  of the backend — the knowledge graph is modeled as relational tables
  (nodes, edges) rather than a separate graph database product, so that
  it participates in the same transactional and backup story as the
  rest of persisted state (`persistence.md`).
- **Vector index:** an embedded vector index co-located with the SQLite
  store for the local-first default (no separate vector database
  service to operate); a dedicated vector store is substituted only
  under the shared-deployment topology, per an ADR if/when that topology
  requires it.

## Android Companion (`docs/20-devices/android-companion.md`)

- **Language:** Kotlin.
- **UI:** Jetpack Compose.
- **Build:** Gradle.
- **IPC to Desktop/core:** the same cross-device sync protocol as every
  other device, per `docs/28-multi-device-protocol/`.

## CLI (`docs/27-cli/`)

- **Language:** TypeScript, same runtime (Node.js 22) as core services,
  built as a standalone binary via the monorepo's build pipeline —
  sharing types and validation schemas with the core services rather
  than reimplementing them.

## File structure (monorepo layout)

```
apps/           # deployable surfaces: desktop, android, cli
packages/       # shared libraries: schemas, sdk, ui-kit
services/       # core runtime services: planner, executor, memory, etc.
docs/           # this documentation
scripts/        # build/release/dev tooling
configs/        # shared lint/tsconfig/build configuration
tools/          # internal dev tools not shipped to users
tests/          # cross-package integration/E2E tests
```

No new top-level directory is created without updating this list — an
AI agent that needs to place a file finds its category here first; if
none fits, that is an escalation trigger
(`docs/05-ai/escalation-rules.md`), not a reason to invent a new
top-level folder.

## Relationship to existing architecture rules

This document states *what* the stack is; `docs/14-development/architecture-rules.md`
states the non-negotiable *behavioral* rules (deterministic-first
ordering, permission gating, execution-tier priority) that apply
regardless of stack. Both are non-negotiable; neither overrides the
other since they govern different dimensions.
