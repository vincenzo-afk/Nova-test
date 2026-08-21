# Project Constraints

## Purpose

The governance-layer restatement of what NOVA — and anyone building or
extending it — must never do, gathered in one place for the AI
Implementation Protocol's Phase 0/1 reading
(`code-generation-rules.md`). The full, canonical list with rationale is
`docs/00-overview/constraints.md`; this file is the fast-reference
version plus the build-process-level constraints that document doesn't
cover (scope, non-goals, stack).

## Scope

Both runtime constraints (what the running system must never do) and
build-time constraints (what an implementer must never do), gathered
together because an AI agent implementing a feature needs both in view
simultaneously — a feature that is architecturally permitted but out of
scope is just as wrong to build as one that violates a runtime
constraint.

## Runtime constraints (summary)

See `docs/00-overview/constraints.md` for the full list and rationale.
Highlights: never mutate an immutable object; never bypass a permission
check; never let a plugin access storage or internal APIs directly;
never let the Planner execute a tool directly; never silently drop an
event; never expose a secret to a plugin, log, or model prompt; never
take an autonomous action outside an approved policy; never treat a
cache as a source of truth.

## Build-time constraints (this file's addition)

- **Never invent an unstated design decision** — `ambiguity-policy.md`.
- **Never substitute a locked technology** — `technology-lock.md`.
- **Never violate a locked architecture rule** — `architecture-lock.md`.
- **Never expand scope beyond what's defined** —
  `docs/00-overview/non-goals.md` and `docs/01-product/project-scope.md`
  remain authoritative; a feature that seems like a natural extension of
  an in-scope feature is still out of scope until a human says
  otherwise.
- **Never merge a change that fails a gate** — `quality-gates.md`.
- **Never edit `docs/00-implementation-governance/` casually** — a
  change to this folder is itself governed by
  `docs/15-decisions/` (ADR) when it changes a lock, a rule, or the
  Constitution; typo fixes and clarifications that don't change meaning
  are the only exception.

## Relationship to other governance files

`forbidden-decisions.md` is the AI-authority-specific subset of this
list (decisions an AI must never make unilaterally); this file is the
broader set including things that are wrong regardless of who or what
made the decision, human included.
