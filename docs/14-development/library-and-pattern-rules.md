# Library, Pattern, Communication & State Management Rules

## Status: full detail — summary lives in the governance folder

`docs/00-implementation-governance/canonical-patterns.md` is the short
summary of the pattern/communication/state-management content below
(the library rules have no separate governance-folder summary since
they're covered by `technology-lock.md`'s scope). If this file and
`canonical-patterns.md` disagree, this file is correct; fix the summary,
per `docs/00-implementation-governance/documentation-precedence.md`.

## Purpose

Locks the remaining implementation-level choices not already covered by
`technology-stack.md`: which libraries are allowed or forbidden, which
design patterns are sanctioned, how modules are permitted to
communicate, and which state-management approach the UI uses — per
Sections 7, 9, 10, and 13 of the second master outline.

## Scope

Cross-cutting rules for any code in the monorepo. Layer-specific import
direction is `docs/02-architecture/dependency-rules.md`; this document
does not restate it, only cross-references it for Section 11 (Import
Rules) and Section 14 (API Rules), both of which already have canonical
homes.

## Library rules

**Allowed:**

- React, React Router (UI)
- Zod (validation, all layers)
- Prisma (data access)
- TanStack Query (async/server state in the UI)
- BullMQ (job queue)
- date-fns (date handling)
- Vitest, Playwright (testing)

**Forbidden:**

- Moment.js — superseded by date-fns; never introduced for new code.
- Lodash — prefer native ES features or small, purpose-built utilities;
  a full general-purpose utility library is disallowed to avoid
  reintroducing the implicit-coupling risk `engineering-principles.md`
  warns against (arbitrary transitive surface area).
- jQuery — no DOM manipulation library; React owns the DOM.
- Axios — the native `fetch` API is the standard; introducing a second
  HTTP client creates two divergent error-handling paths.
- Redux, Zustand, Jotai, Signals (as a *replacement* for the state rule
  below) — exactly one state-management approach is used; see below.

A library not on either list is treated as forbidden until explicitly
added — silence is not permission, per `ai-implementation-philosophy.md`.

## Architecture and pattern rules

- **Architecture style:** Layered/Clean Architecture
  (UI → Application → Domain → Infrastructure), per
  `docs/02-architecture/dependency-rules.md` — this is the one and only
  architecture style used; Hexagonal, DDD-as-a-separate-style, and MVC
  are not alternate options to mix in.
- **Allowed patterns:** Repository (data access), Strategy (execution
  tier selection, model routing), Observer (event bus subscribers,
  literally implemented via the event bus rather than a bespoke observer
  object), State (the state machines catalogued in
  `docs/26-system-reference/16-lifecycle-and-state-machine-index.md`).
- **Forbidden patterns:** Singleton (conflicts with "no hidden global
  state," `engineering-principles.md`), deep inheritance hierarchies
  (Composition over inheritance is a fixed principle, not a preference),
  Service Locator (defeats explicit dependency injection).
- **Dependency injection:** required for any component with a
  substitutable dependency (a provider, a storage backend) — passed
  explicitly through constructors/factory functions, never resolved
  through a global registry at the call site.

## Communication rules

Modules never call each other's internals directly. Per
`constraints.md` and `docs/02-architecture/event-bus-specification.md`:

```
Planner            Executor
   \                  /
    \                /
     [ Event Bus / declared contract interfaces ]
```

The only two sanctioned communication paths between independently-owned
modules are: (1) the event bus, for anything asynchronous or
one-to-many, and (2) an explicitly declared contract interface (e.g.,
`docs/03-runtime/planner-executor-contract.md`) for a direct,
synchronous handoff between two specific components. A module reaching
into another module's internal state, calling a private method, or
sharing a mutable object by reference across a module boundary is a
defect regardless of whether it "happens to work."

## State management rules (UI)

Exactly one state-management approach, split by state category:

- **Server/async state** (data fetched from core services): TanStack
  Query — owns caching, refetching, and loading/error states for
  anything backed by the internal API.
- **Local UI state** (component-local, ephemeral): React's built-in
  `useState`/`useReducer` — no external library for state that doesn't
  leave the component.
- **Cross-component client state** (state shared across the UI but not
  server-backed, e.g., current theme, active workspace selection):
  React Context, kept intentionally small — if a Context's update
  frequency or consumer count grows large enough to cause performance
  problems, that is an escalation to revisit this rule via ADR, not a
  reason to introduce a second state library ad hoc.

No component introduces Redux, Zustand, Jotai, or a signals library for
any of the three categories above without an ADR explicitly changing
this rule.

## Relationship to other rules

Import direction (Section 11) is governed by
`docs/02-architecture/dependency-rules.md`; API style (Section 14) is
governed by `docs/08-api/` (REST, WebSocket, internal API, each already
specified). This document does not duplicate either.
