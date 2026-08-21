# Canonical Patterns

## Purpose

The governance-layer, single-page answer to "which design pattern do I
use here." Full reasoning and the communication/state-management rules
this summarizes live in
`docs/14-development/library-and-pattern-rules.md`.

## Scope

Design patterns and structural idioms used across the codebase. Naming
and formatting conventions are `docs/14-development/naming-conventions.md` and `docs/14-development/coding-standards.md`, not this file.

## Allowed patterns

- **Repository** — all data access (`docs/13-devops/persistence.md`).
- **Strategy** — execution-tier selection
  (`docs/06-tools/execution-priority.md`), model routing
  (`docs/05-ai/model-routing-matrix.md`).
- **Observer** — implemented literally via the event bus
  (`docs/02-architecture/event-bus-specification.md`), never as a
  bespoke in-process observer object.
- **State** — every entity in
  `docs/26-system-reference/16-lifecycle-and-state-machine-index.md`
  is implemented as an explicit state machine, not an implicit set of
  boolean flags.
- **Dependency Injection** — required for any component with a
  substitutable dependency; passed explicitly through
  constructors/factories, never resolved through a global registry.

## Forbidden patterns

- **Singleton** — conflicts with "no hidden global state"
  (`implementation-rules.md`).
- **Deep inheritance hierarchies** — Composition over inheritance is a
  fixed principle (`docs/00-overview/engineering-principles.md`,
  Principle 3), not a preference to weigh against convenience.
- **Service Locator** — defeats explicit dependency injection and hides
  a component's real dependency list.

## Communication pattern (canonical)

Modules never call each other's internals directly:

```
Component A            Component B
     \                     /
      \                   /
   [ Event Bus / declared contract interface ]
```

The only two sanctioned paths between independently-owned modules: the
event bus (asynchronous, one-to-many) or an explicitly declared contract
interface (synchronous, one-to-one, e.g.
`docs/03-runtime/planner-executor-contract.md`).

## State management pattern (UI, canonical)

Exactly one approach per state category — see
`docs/14-development/library-and-pattern-rules.md` for the full
rationale:

- Server/async state → TanStack Query
- Local component state → React `useState`/`useReducer`
- Cross-component client state → React Context, kept small

## Error handling pattern (canonical)

Result pattern for expected failures, exceptions only for genuinely
unexpected/non-recoverable conditions — see
`docs/14-development/error-handling-tagging-and-performance-rules.md`.

## Using a pattern not listed here

Not listed means not yet decided, per `decision-authority-matrix.md`'s
default rule — raise it via `ambiguity-policy.md` rather than
introducing it and documenting it after the fact.
