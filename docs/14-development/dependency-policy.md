# Dependency Policy

## Purpose

The process for adding a **new** third-party dependency to NOVA's stack
— `docs/00-implementation-governance/technology-lock.md` is the registry
of what's already locked; this file is what happens before something
earns a row there. Zero rows in `technology-lock.md` today were added
without going through a process — this file makes that process explicit
rather than leaving it to be inferred.

## Scope

Third-party library/package/service additions. Adding a new NOVA-
internal module is `directory-contract.md`'s and
`docs/02-architecture/dependency-map.md`'s concern, not this one.

## When a new dependency is warranted

A new dependency is added only when:

1. **The capability isn't already covered** by something in
   `technology-lock.md`'s existing stack — checked first, since the
   single largest source of avoidable dependency bloat is not checking
   whether the current ORM/framework/utility already solves the problem
   less directly.
2. **It doesn't duplicate an existing dependency's job** — two libraries
   solving the same problem (e.g., two HTTP clients, two validation
   libraries) is a locked-decision violation the moment the second one
   is added, per `technology-lock.md`'s "impossible to miss or
   soft-pedal into a preference" framing.
3. **It's compatible with the deployable-surface stack** already locked
   (per `technology-lock.md`'s Scope) — a dependency that only works in
   a hosted-server topology is not added for a feature that must also
   run in the local-first desktop topology, without an explicit,
   documented platform-conditional justification.

## Process

1. Propose the addition with: what capability it provides, why nothing
   currently locked covers it, and its license (must be compatible with
   `docs/29-product/licensing.md`).
2. Add a row to `technology-lock.md` in the same change — a dependency
   used in code without a corresponding locked-decision row is exactly
   the kind of implicit, undocumented decision this repository's
   discipline exists to prevent.
3. If the addition changes `docs/02-architecture/dependency-graph.json`'s
   service dependency structure (rare — most new libraries are
   implementation detail inside one service, not a new inter-service
   edge), update that file and re-verify it stays acyclic, per that
   file's own validation note.

## Related documents

- `docs/00-implementation-governance/technology-lock.md` — the registry this process feeds
- `docs/29-product/licensing.md` — license compatibility requirement
- `docs/02-architecture/dependency-graph.json`, `dependency-map.md` — the service-level dependency graph, distinct from library-level dependencies
