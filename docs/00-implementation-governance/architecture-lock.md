# Architecture Lock

## Purpose

The governance-layer entry point for NOVA's non-negotiable architectural
rules. Full detail and the reasoning behind each rule lives in
`docs/14-development/architecture-rules.md`; this file is the short,
locked summary an AI agent checks before touching any code path that
crosses a subsystem boundary.

## Scope

System-wide architectural constraints, independent of which language or
framework implements them (`technology-lock.md` is the "what it's built
with" lock; this is the "how the pieces are allowed to relate to each
other" lock).

## The lock (summary)

1. **Deterministic Before Intelligent is checked first, always.** No
   code path invokes an LLM call before the deterministic-first check
   (`docs/05-ai/deterministic-first.md`) has run for that task or step.
2. **No execution bypasses the Permission Manager.** Every path from
   Planner/Executor to an OS-level action passes through
   `docs/03-runtime/permission-manager.md`, with no exception for
   "trusted" internal callers.
3. **The execution-priority chain order is fixed.** A new tool
   integration is never registered ahead of a higher execution tier
   capable of the same action (`docs/06-tools/execution-priority.md`).
4. **No unattended execution without a verification signal.** A tool
   declaring `verification_signal: "none"` is structurally restricted
   to confirmation-required execution.
5. **The Knowledge Graph ontology is closed at runtime** — new entity
   types are added through the documented schema process
   (`docs/04-memory/ontology.md`), never invented ad hoc by a component.
6. **Architecture style is Layered/Clean Architecture, one direction
   only** (UI → Application → Domain → Infrastructure), per
   `docs/02-architecture/dependency-rules.md` — never reversed, never
   mixed with a second style.
7. **Modules communicate only through the event bus or a declared
   contract interface** — never through direct calls into another
   module's internals. See `docs/14-development/library-and-pattern-rules.md`,
   Communication Rules.
8. **Component boundaries in
   `docs/26-system-reference/15-build-contracts.md` are fixed** — a
   subsystem's "Must never" list is exactly as binding as its "Can"
   list.

## Rule

Every rule above is checked in code review by tracing the actual call
path, not by trusting a comment or a variable name that claims
compliance. A violation is rejected regardless of how narrow, temporary,
or well-intentioned it appears — see `forbidden-decisions.md` and `ai-constitution.md`, Rule 2 (Do not invent architecture).

## Full detail

`docs/14-development/architecture-rules.md` — the complete, numbered
rule set with the reasoning behind each; `docs/02-architecture/` — the
subsystem-level architecture documents these rules are derived from.
