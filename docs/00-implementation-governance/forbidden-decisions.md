# Forbidden Decisions (AI MUST NEVER Decide)

## Purpose

The Forbidden-class decisions from `decision-authority-matrix.md`,
expanded into a scannable list. Every item below has already been
decided by a human and is documented elsewhere; an AI agent's job is to
find and follow that decision, never to re-derive or "improve" it.

## Scope

Build-time and design-time decisions only. Runtime behavioral
prohibitions for NOVA itself (what the running system must never do)
are `project-constraints.md`, not this file.

## The list

**Status: illustrative, not exhaustive.** Absence from this list is
never read as permission — see `decision-authority-matrix.md`'s default
rule and `ambiguity-policy.md`. This list exists to make the most
common forbidden decisions fast to check, not to bound the category.

- **Programming language, runtime, or framework** — `technology-lock.md`.
- **Database or ORM choice** — `technology-lock.md`.
- **Folder / monorepo structure** — `technology-lock.md`.
- **Public API design or wire schema shape** — `docs/08-api/`.
- **Authentication or authorization model** — `docs/10-security/`.
- **Permission model or capability vocabulary** —
  `docs/16-extensibility/plugin-permissions.md`.
- **Event names or event envelope shape** —
  `docs/26-system-reference/07-event-catalog.md`.
- **Overall architecture style or allowed design patterns** —
  `architecture-lock.md`, `canonical-patterns.md`.
- **Build system or package manager** — `technology-lock.md`.
- **State-management approach** — `canonical-patterns.md`.
- **Contracts, schemas, or message formats** for any entity in
  `docs/26-system-reference/14-data-models.md`.
- **The memory model or knowledge graph ontology** —
  `docs/04-memory/ontology.md`.
- **The plugin/extension model** — `docs/16-extensibility/`.
- **Retry, timeout, or concurrency defaults** —
  `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md`.
- **Versioning or breaking-change policy** —
  `docs/26-system-reference/20-versioning-contracts.md`.

## What "forbidden" means in practice

An AI agent encountering a need that seems to require deviating from one
of the above does not implement the deviation and note it in the PR
description. It stops, per `ambiguity-policy.md`, and raises the need to
a human — who may choose to record a new decision via ADR
(`docs/15-decisions/`), at which point the relevant lock document is
updated and this list follows suit.

## Relationship to Allowed Decisions

This list and `allowed-decisions.md` are complements, not overlapping
categories — anything not on this list is not automatically allowed; it
must appear on the Allowed list or be classified Required/Preferred
elsewhere to be something an AI agent can act on without asking.
