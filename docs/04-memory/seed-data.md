# Seed Data

## Purpose

What, if anything, is pre-populated into `table-contracts.md`'s tables
before a NOVA instance has processed any real user data — distinct from
the initial scan described in `docs/31-user-flows/onboarding-flow.md`,
which populates real data from granted sources rather than seeding
placeholder data.

## Scope

Fixed, shipped-with-the-application reference data only. User-generated
or observation-derived data is never seeded — it originates exclusively
from the flows described elsewhere (`onboarding-flow.md`, the Observer
framework, direct user action).

## What is seeded

- **Knowledge Graph ontology** — the fixed entity-type and relation-type
  enums defined in `docs/04-memory/ontology.md` are loaded as reference
  rows (or equivalently, application-level constants the schema
  validates `graph_nodes.entity_type` / `graph_edges.relation_type`
  against) at first run. This is metadata about the schema's shape, not
  user data, and is identical across every NOVA install.
- **Default identity** — a single default `identities` row is created on
  first run for the local-first single-user topology, before onboarding
  asks the user anything — per `onboarding-flow.md`, NOVA is immediately
  queryable even with an empty history, which requires an identity to
  attach that (empty) history to.
- **Feature maturity / capability registry bootstrap** — the initial set
  of Stable capabilities from `docs/26-system-reference/
  10-feature-maturity-table.md` are registered into the Capability
  Registry at first run, not discovered dynamically, since the core v1
  capability set is fixed at ship time.

## What is explicitly never seeded

- **Any `recent_memory_entries` or `long_term_memory_entries` row** —
  seeding fabricated memory would violate the grounding requirement in
  `docs/04-memory/search.md` (every answer traceable to a real retrieved
  record) from the very first query.
- **Any `graph_nodes` row representing a real-world entity** — a
  pre-seeded "example" entity would be indistinguishable from a real
  observed one to the Retrieval Fusion Engine, risking a hallucinated
  answer sourced from placeholder data. Demo/tutorial content, if any,
  is rendered entirely in the UI layer and never written to these
  tables.

## Related documents

- `table-contracts.md` — the tables seed data (or its deliberate absence) applies to
- `docs/04-memory/ontology.md` — the fixed ontology seeded as reference data
- `docs/31-user-flows/onboarding-flow.md` — how real data begins populating these tables after seed data
- `docs/26-system-reference/10-feature-maturity-table.md` — the capability set bootstrapped at first run
