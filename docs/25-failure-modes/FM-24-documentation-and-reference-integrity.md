# FM-24: Documentation & Reference Integrity

## Purpose

Every file in `docs/26-system-reference/` (the dependency graph,
startup/shutdown sequences, state tables, data-ownership map, error
catalog, event catalog, configuration reference, version matrix, feature
maturity table, sequence diagrams) and every other reference document in
this repository is itself a build artifact an AI agent relies on
directly. This file consolidates the failure mode this whole category
shares — **documentation drifting from the system it describes, silently
and without a corresponding runtime error** — which is otherwise easy to
under-rate relative to the "real" subsystem failures cataloged in
`FM-01` through `FM-23`.

Individual instances of this failure are also listed inline in each
`docs/26-system-reference/` file's own "Where This Breaks" section
(numbered `FM-24-001` through `FM-24-035`, cross-referenced here); this
file is the index and the cross-cutting analysis, not a duplicate list.

## Why this category is different from the other 23

Every other FM file describes a failure with an observable runtime
symptom — a crash, a wrong answer, a security incident. A stale
dependency graph or a config-reference doc that no longer matches the
schema produces **no runtime symptom at all**. The only observable effect
is a *second-order* one: an agent (human or AI) reading the stale
document makes a decision that's wrong in a way that eventually surfaces
as some other, unrelated-looking failure elsewhere in this catalog. This
is why every fix in this category is a CI/process fix
(`docs/26-system-reference/11-documentation-lint-ci.md`), not a runtime
mitigation — there is no runtime signal to hook a mitigation onto.

## Consolidated failure index

| ID | Document | Failure | Severity |
|---|---|---|---|
| `FM-24-001` – `003` | `01-component-dependency-graph.md` | Tree diverges from `docs/02-architecture/dependency-map.md`; false inferred dependency; silent cycle introduction | Medium–High |
| `FM-24-004` – `006` | `02-startup-sequence.md` | Sequence doc drifts from boot code; reader stops at simplified summary; see also FM-15 | Low–Medium |
| `FM-24-007` – `009` | `03-shutdown-sequence.md` | Checklist omits a new teardown step; see also FM-15; reader wrongly assumes startup/shutdown are mirror images | Low–Medium |
| `FM-24-010` – `012` | `04-state-transition-tables.md` | Table omits a real state/transition; undocumented 'convenience' transition ships; two tables disagree at a shared boundary | Low–Critical |
| `FM-24-013` – `015` | `05-data-ownership.md` | New module ships with no ownership entry; direct-mutation shortcut becomes permanent; ownership table drifts from dependency graph | Low–High |
| `FM-24-016` – `018` | `06-error-catalog.md` | Catalog entry drifts from actual trigger; orphaned FM entry with no code; two failures sharing one code | Medium |
| `FM-24-019` – `021` | `07-event-catalog.md` | Catalog omits a real event type; example payload drifts from actual schema; see also FM-15 | Medium |
| `FM-24-022` – `024` | `08-configuration-reference.md` | Illustrative config drifts from schema; reader treats example as literal shipped default; see also FM-15/FM-20 | Low–Medium |
| `FM-24-025` – `026` | `09-version-compatibility-matrix.md` | Matrix not updated on release; claimed compatibility doesn't hold in practice | Medium–High |
| `FM-24-027` – `029` | `10-feature-maturity-table.md` | Stable label claimed for something still unstable; agent builds hard dependency on Planned feature; Deprecated feature lingers past schedule | Low–Medium |
| `FM-24-030` – `032` | `11-documentation-lint-ci.md` | The lint checks themselves have a false negative; a failing check is bypassed under pressure; a new drift category has no covering check yet | Medium–High |
| `FM-24-033` – `035` | `12-sequence-diagrams.md` | Diagram omits a real error branch; diagram drifts after a refactor; diagram wrongly treated as normative over prose | Low–Medium |

## The single mitigation that covers this whole category

Every entry above resolves to the same underlying fix: an automated,
CI-enforced cross-check between the document and the thing it describes
(code, schema, another document), specified in full in
`docs/26-system-reference/11-documentation-lint-ci.md`. Any new
reference document added to this repository in the future must be
added to that file's Checks table with its own drift-detection mechanism
*before* it's considered complete — a reference document with no
corresponding drift check is, by the definition established in this
file, already a latent instance of `FM-24`.

## Related documents

- `docs/26-system-reference/` — every file in this folder, whose own
  "Where This Breaks" sections are the detailed per-document entries
  this file consolidates
- `docs/26-system-reference/11-documentation-lint-ci.md` — the actual
  enforcement mechanism
- `docs/25-failure-modes/INDEX.md` — update this index to include this file
