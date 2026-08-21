# Import Rules

## Purpose

Code-level import conventions — which modules a given layer is allowed
to import from, enforced at code-review/lint time. Distinct from
`docs/02-architecture/dependency-map.md`'s service-level dependency
graph (which service calls which over the Communication Bus) — this
file is about direct code-level imports within a single service's
codebase.

## Scope

Import direction and layering rules. Third-party package addition is
`dependency-policy.md`; where a new file belongs is `directory-
contract.md`.

## Layering rule

Imports flow in one direction only, matching `docs/02-architecture/
dependency-graph.json`'s acyclic service graph one level down: a
module never imports from a module that (directly or transitively)
imports from it. The dependency graph's own acyclicity check
(`dependency-graph.json`'s validation note) is the service-level version
of this same rule — code-level imports within a service must not
introduce a cycle the service-level graph doesn't have, since a
service-internal import cycle is just as much an unmaintainable-coupling
problem as a service-level one, merely invisible to the service graph.

## No reaching across a service boundary

A module inside one of the 17 services in `docs/02-architecture/
dependency-map.md` never directly imports an internal module of a
different service — cross-service interaction happens exclusively
through the Communication Bus (`docs/02-architecture/
communication-model.md`) or a documented public interface
(`docs/03-runtime/`'s contracts), never a direct code import that
bypasses the bus. This is what keeps the dependency graph in
`dependency-graph.json` an accurate picture of the actual coupling
in the codebase, rather than a diagram that drifts from reality the
first time someone takes a shortcut.

## Shared utilities are the one exception

Genuinely cross-cutting, stateless utilities (e.g., ID generation
following `docs/14-development/naming-conventions.md`, structured
logging helpers per `docs/13-devops/logging.md`) live in a shared
utility layer every service may import from — this is not a violation
of the no-cross-service-import rule above because a utility module has
no service-owned state and no service-specific business logic; it is
purely a leaf dependency every service depends on, never the reverse.

## Related documents

- `docs/02-architecture/dependency-map.md`, `dependency-graph.json` — the service-level graph this file's rule extends downward
- `docs/02-architecture/communication-model.md` — the only sanctioned cross-service interaction path
- `dependency-policy.md` — adding a new third-party import
- `docs/14-development/coding-standards.md` — general code-level conventions this file is a narrower companion to
