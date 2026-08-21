# Canonical Document Index

## Purpose

A single lookup table answering three questions an AI agent (or human)
should be able to answer before trusting any document in this
repository:

1. **What is the canonical doc for concept X?**
2. **Which doc is the summary, and which is the full detail?**
3. **Is this a locked decision, or an explanatory/descriptive doc?**

This index does not restate content — it points. If this index and a
document's own stated status
(a "Status: canonical" or "Status: derived view" header, where present)
ever disagree, the document's own header wins and this index is stale —
fix the index in the same change, per
`docs/00-implementation-governance/documentation-precedence.md`.

## How to read this table

- **Canonical** — the one authoritative source for this concept's
  actual content.
- **Summary/entry-point** — a shorter document that points to the
  canonical one; safe to read first, but never the final word if it
  conflicts with the canonical doc.
- **Locked?** — Yes means Required per
  `docs/00-implementation-governance/decision-authority-matrix.md`
  (no negotiation); No means explanatory/descriptive (can evolve without
  an ADR, though still shouldn't silently drift from reality).

## Governance layer

| Concept | Canonical | Summary/entry-point | Locked? |
|---|---|---|---|
| Master process rules | `docs/00-implementation-governance/ai-constitution.md` | `/CONSTITUTION.md` (root pointer) | Yes |
| Decision classification | `docs/00-implementation-governance/decision-authority-matrix.md` | — | Yes |
| What AI may decide | `docs/00-implementation-governance/allowed-decisions.md` | — | Yes |
| What AI must never decide | `docs/00-implementation-governance/forbidden-decisions.md` | — | Yes |
| Ambiguity handling | `docs/00-implementation-governance/ambiguity-policy.md` | — | Yes |
| Technology stack | `docs/14-development/technology-stack.md` | `docs/00-implementation-governance/technology-lock.md` | Yes |
| Architecture rules | `docs/14-development/architecture-rules.md` | `docs/00-implementation-governance/architecture-lock.md` | Yes |
| Coding patterns | `docs/14-development/library-and-pattern-rules.md` | `docs/00-implementation-governance/canonical-patterns.md` | Yes |
| Build process (4-phase protocol) | `docs/43-ai-development/implementation-order.md` | `docs/00-implementation-governance/code-generation-rules.md` | Yes |
| Completion criteria | `docs/43-ai-development/definition-of-done.md` | `docs/00-implementation-governance/definition-of-done.md` | Yes |
| Merge gates | — (new, this file is canonical) `docs/00-implementation-governance/quality-gates.md` | — | Yes |
| Runtime + build constraints | `docs/00-overview/constraints.md` (runtime) | `docs/00-implementation-governance/project-constraints.md` (adds build-time) | Yes |
| Task walkthrough | — (new, this file is canonical) `docs/00-implementation-governance/implementation-checklist.md` | — | No (process aid) |

## Cross-cutting contracts

| Concept | Canonical | Notes |
|---|---|---|
| Build contracts (per-component Can/Cannot) | `docs/26-system-reference/15-build-contracts.md` | Covers Planner, Executor, Memory Manager, Verifier, Plugin Host |
| Data models (every cross-component entity) | `docs/26-system-reference/14-data-models.md` | |
| State machines — index | `docs/26-system-reference/16-lifecycle-and-state-machine-index.md` | Points into the canonical table below |
| State machines — formal transition tables | `docs/26-system-reference/04-state-transition-tables.md` | Task lifecycle table is a derived copy of `docs/03-runtime/task-manager.md` (the canonical source, per `docs/00-overview/normative-precedence.md`); the two are reconciled — see task-manager.md's Task state machine section for the resolution note |
| Plugin lifecycle states specifically | `docs/16-extensibility/plugin-lifecycle.md` | `04-state-transition-tables.md`'s Plugin table is a derived summary of this |
| Event catalog | `docs/26-system-reference/07-event-catalog.md` | `17-event-and-internal-api-contracts.md` is the dimension-completeness checklist, not a second catalog |
| Internal API contracts | `docs/08-api/internal-api.md` | |
| Permission model (system-wide) | `docs/10-security/permissions.md` | `docs/03-runtime/permission-manager.md` is the runtime enforcement mechanism, not a second policy source |
| Plugin permissions specifically | `docs/16-extensibility/plugin-permissions.md` | |
| Memory ontology | `docs/04-memory/ontology.md` | Single source, no duplication found |
| Retry / timeout / concurrency rules | `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md` | Summarized (not restated independently) in `docs/00-implementation-governance/technology-lock.md` |
| Versioning contracts | `docs/26-system-reference/20-versioning-contracts.md` | |
| Error catalog | `docs/26-system-reference/06-error-catalog.md` | Error *format/pattern* (Result vs exception) is `docs/14-development/error-handling-tagging-and-performance-rules.md` — different question, both canonical for their own scope |
| Dependency graph (service-level) | `docs/02-architecture/dependency-map.md` | `docs/43-ai-development/dependency-map.md` is an explicitly-marked derived, task-oriented view |
| Edge cases | `docs/37-edge-cases/00-index.md` | Index into individual scenario files |
| Failure modes | `docs/25-failure-modes/` (per-subsystem FM files) | Distinct from edge cases: failure modes catalog detection/mitigation, edge cases catalog concrete scenarios |
| Relational schema (tables/relationships/indexes/transactions/seed data) | `docs/04-memory/table-contracts.md` + siblings | `relationships.md`, `indexes.md`, `transactions.md`, `seed-data.md` — one cluster, cross-referenced from `memory-architecture.md` |
| Metrics catalog | `docs/26-system-reference/22-metrics-catalog.md` | Stable metric names; `docs/13-devops/monitoring.md` describes what's monitored qualitatively |
| Data classification | `docs/10-security/data-classification.md` | Handling-rule categories, not an encryption-tiering scheme — `encryption.md` remains uniform |
| API endpoint catalog | `docs/08-api/endpoint-catalog.md` | Literal method+path list; `rest-api.md` covers categories/conventions |
| Pagination | `docs/08-api/pagination.md` | |
| Event bus consumer retry | `docs/02-architecture/event-retry.md` | Reuses `19-ordering-concurrency-and-retry-rules.md`'s default policy; adds bus-specific poison-message/override rules |
| Directory placement for new docs | `docs/14-development/directory-contract.md` | Forward-looking; complements this index's backward-looking lookup |
| Third-party dependency addition | `docs/14-development/dependency-policy.md` | Process feeding `technology-lock.md`'s registry |
| Code-level import/layering rules | `docs/14-development/import-rules.md` | One level down from the service-level `dependency-map.md` graph |
| Algorithmic complexity budgets | `docs/39-performance-budgets/complexity-budget.md` | Growth-shape companion to `latency-targets.md`'s absolute-time budgets |

## Product and architecture layer

| Concept | Canonical |
|---|---|
| Product vision | `docs/00-overview/vision.md` |
| Product scope | `docs/01-product/project-scope.md` |
| System invariants | `docs/00-overview/system-invariants.md` |
| Design principles | `docs/00-overview/design-principles.md` |
| Engineering principles | `docs/00-overview/engineering-principles.md` |
| Normative precedence (spec-vs-spec conflicts) | `docs/00-overview/normative-precedence.md` |
| Process precedence (governance-vs-spec relationship) | `docs/00-implementation-governance/documentation-precedence.md` |

## Known unresolved conflicts (do not treat either side as settled)

None open as of this revision.

## Resolved conflicts (historical)

- **Task/Agent state machine** — `docs/03-runtime/task-manager.md` vs.
  `docs/26-system-reference/04-state-transition-tables.md` (and, found
  during reconciliation, a third divergent copy in
  `docs/26-system-reference/16-lifecycle-and-state-machine-index.md`).
  Resolved by applying `docs/00-overview/normative-precedence.md`
  (extended in this revision to explicitly cover
  `docs/26-system-reference/` as derived/non-authoritative): `docs/03-runtime/task-manager.md` is canonical; the two system-reference
  copies were corrected to match it, including folding in one genuine
  behavior gap the divergent copies had captured and task-manager.md
  had not (the ambiguity-resolution clarifying-question transition, now
  `Planning → WaitingUser → Planning` in the canonical version).

## Maintenance rule

Introducing a new cross-cutting concept (something more than one
subsystem needs to reference) requires adding a row here in the same
change that introduces the concept's canonical document — an
undocumented-but-real concept is exactly what lets a second, competing
"canonical" doc get written by accident later, per
`docs/26-system-reference/11-documentation-lint-ci.md`.
