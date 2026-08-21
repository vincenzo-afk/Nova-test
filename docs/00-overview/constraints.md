# Constraints

## Relationship to the governance folder

`docs/00-implementation-governance/project-constraints.md` is the
fast-reference summary of this document (plus the build-time
constraints that document adds on top). This file remains the full,
rationale-bearing list. If the two disagree, this file is correct; fix
the summary, per
`docs/00-implementation-governance/documentation-precedence.md`.

## Purpose

Lists what NOVA — and any AI agent implementing, extending, or operating
NOVA — must never do, stated as direct prohibitions rather than as
system properties. This document is deliberately distinct from
`system-invariants.md`: an invariant states a truth that always holds
("every entity has exactly one immutable ID"); a constraint states an
action that is forbidden regardless of how it's justified ("never bypass
a permission check"). Most constraints exist *to protect* an invariant
or a security boundary, but they are phrased as rules for the actor
(human or AI) rather than properties of the system, because they are
most useful at the moment someone is deciding whether to take an action.

## Scope

Applies to runtime code, plugins, and any AI agent (including one
implementing this repository) with write access to the system or its
documentation. Where a constraint here appears to conflict with a
feature request, the constraint wins by default — overriding one
requires an ADR (`docs/15-decisions/`), not a one-off exception in code
review.

## Runtime constraints

- **Never mutate an immutable object.** Entity IDs, event `message_id`s,
  and versioned memory records are write-once. See
  `system-invariants.md`.
- **Never bypass a permission check**, including for "obviously safe"
  internal calls, debug builds, or trusted-looking callers. See
  `docs/10-security/permissions.md` and `docs/10-security/permission-escalation.md`.
- **Never access storage directly from a plugin or from outside the
  owning repository layer.** All persistence goes through the owning
  component's public API. See `docs/16-extensibility/plugin-sandboxing.md` and `docs/13-devops/storage-layout.md`.
- **Never call an internal API from a plugin.** Plugins interact only
  through the capabilities explicitly granted to them. See
  `docs/16-extensibility/plugin-permissions.md`.
- **Never let the Planner execute a tool directly.** All execution is
  gated through the Executor. See `docs/03-runtime/executor.md`.
- **Never silently drop an event.** An event that cannot be delivered or
  processed is retried, dead-lettered, or logged — never discarded
  without a trace. See `docs/02-architecture/event-bus-specification.md`.
- **Never expose a secret or credential to a plugin, a log line, or a
  model prompt.** See `docs/10-security/secrets.md` and `docs/18-providers/credential-management.md`.
- **Never take an autonomous action outside an explicitly approved
  policy.** See `docs/25-failure-modes/FM-18-autonomy-policy-approval.md`.
- **Never merge two entities in the knowledge graph without preserving a
  redirect from the retired ID.** See
  `docs/04-memory/entity-resolution.md`.
- **Never treat a cache as a source of truth.** A cache miss or
  invalidation must always be resolvable from the owning persisted
  source. See `docs/11-performance/caching.md`.

## Development and AI-implementation constraints

- **Never invent an unstated design decision.** Where the documentation
  is silent, flag the gap; do not fill it with a plausible default. See
  `ai-implementation-philosophy.md`.
- **Never introduce a circular dependency**, including indirect cycles
  through the event bus. See `docs/02-architecture/dependency-rules.md`.
- **Never duplicate business logic that already has an owning module.**
  See `docs/14-development/anti-patterns.md`.
- **Never mark a feature complete without running the Phase 4
  self-review checklist.** See
  `docs/43-ai-development/review-checklist.md`.
- **Never ship a public API without tests.** See
  `docs/12-testing/testing-strategy.md`.
- **Never edit implementation code without updating the doc it
  contradicts, in the same change.** See
  `docs/26-system-reference/11-documentation-lint-ci.md`.
- **Never resolve a genuine ambiguity by guessing silently** where
  `docs/05-ai/ambiguity-resolution.md` calls for surfacing it to the
  user or the reviewer instead.

## Relationship to invariants and the failure matrix

Where a constraint is violated anyway (a bug, a compromised plugin, a
regression), the resulting behavior is defined by the Failure Matrix
(`docs/25-failure-modes/`, `docs/36-failure-catalog/`) — constraints
describe what must not happen by design, the failure matrix describes
what the system does if it happens regardless. Both documents must agree
that a constraint violation is always treated as an error condition,
never as a silently-accepted alternate path.
