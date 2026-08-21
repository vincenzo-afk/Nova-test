# Documentation Lint / CI Process

## Purpose

Documentation in this repository is treated as a build artifact with the
same CI discipline as code — this document specifies exactly what gets
checked automatically, why, and what fails the build. Every "Where This
Breaks" section throughout `docs/25-failure-modes/` and `docs/26-system-reference/` references specific checks defined here; this
is where those checks are actually specified as a runnable process.

## Checks

| Check | What it catches | Fails build on |
|---|---|---|
| **Broken internal links** | A cross-reference (e.g. `` `docs/03-runtime/executor.md` `` — a real file, shown only as an illustration of the reference *style* this check applies to) pointing to a file or anchor that doesn't actually exist | Any dead cross-reference — reference implementation: `scripts/check-links.py`, run in CI on every PR touching `docs/` and re-run after any bulk edit; also flags ambiguous same-basename references and line-wrap-broken inline code spans |
| **Orphaned documents** | A file under `docs/` not linked from any README index or `Related documents` section anywhere | Any doc with zero inbound references |
| **Dependency-graph consistency** | `01-component-dependency-graph.md`'s tree vs. `docs/02-architecture/dependency-map.md`'s Mermaid graph disagreeing on module list or an edge | Any module present in one but not the other |
| **State-machine conformance** | `04-state-transition-tables.md`'s tables vs. the actual states/transitions reachable in code | Any code-reachable transition absent from the documented table, or vice versa |
| **Config schema/example sync** | `08-configuration-reference.md`'s example `config.yaml` vs. `docs/14-development/configuration-schema.md`'s established keys | Any key present in one but not the other |
| **Error catalog / FM cross-reference** | Medium+ severity `docs/25-failure-modes/` entries with no `NOVA-` code in `06-error-catalog.md`, and codes with no FM cross-reference | Any orphan in either direction |
| **Event catalog / codebase sync** | `07-event-catalog.md`'s table vs. actual `event_type` string literals found in the codebase | Any event type present in one but not the other |
| **Startup/shutdown order assertion** | `02-startup-sequence.md` / `03-shutdown-sequence.md` vs. the actual runtime's logged step order (integration test, not static analysis) | Any step-order mismatch |
| **FM ID uniqueness and stability** | Duplicate FM IDs, or an FM ID whose text changed enough to no longer match historical incident-report citations | Any duplicate ID; large unexplained diffs to an existing FM entry without a changelog note |
| **Glossary coverage** | A term used in 3+ documents with no `docs/00-overview/glossary.md` entry | New jargon introduced without a definition |
| **Naming-convention conformance** | New identifiers/fields/states that don't follow `docs/14-development/naming-conventions.md` | Any non-conforming new schema field or state name |
| **Version-matrix freshness** | `09-version-compatibility-matrix.md` not updated in a release that changed any of its four tracked version columns | Missing row for the current release |
| **Feature-maturity claim check** | A `Stable`-labeled feature (`10-feature-maturity-table.md`) with an incident rate above the configured threshold for a sustained window | Triggers a review flag, not necessarily a hard CI failure — routed to `docs/14-development/technical-debt.md` |

## Where this runs

As a required CI job on every pull request touching `docs/` or any
schema/interface definition the doc-lint checks cross-reference, per
`docs/14-development/release-checklist.md`. A PR cannot merge with a
failing doc-lint job any more than it can merge with a failing unit-test
job — the two are peers in this repository's quality bar, not
docs-as-an-afterthought.

## Why this exists as its own document

Every failure mode across this whole document set that says "the doc
drifted from reality" (see the `FM-24-*` entries scattered through `docs/26-system-reference/`) has the same actual mitigation: an automated
check that would have caught the drift before merge. Rather than
re-describing "add a CI check" in twelve different files, this document
is the single place that check is actually specified, and every other
file's "Where This Breaks" section points here.

## Related documents

- `docs/14-development/release-checklist.md` — where doc-lint sits in
  the overall release gate
- `docs/25-failure-modes/FM-24-documentation-and-reference-integrity.md`
  — the consolidated failure catalog for documentation drift generally
- `docs/14-development/documentation-style-guide.md` — style rules this
  process does not itself enforce (style is reviewed by humans; this
  process enforces factual/structural consistency)

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-030** | Doc-lint check itself has a false negative | A check's implementation has a gap (e.g. regex-based link checking misses a valid-looking but actually-broken relative path) and drift ships anyway. | Periodic manual audit of a random document sample, cross-checked against what doc-lint should have caught. | Medium | Test the doc-lint checks themselves against deliberately-broken fixture documents, the same way any other CI tooling is tested. | Fix the specific gap in the check; add the missed case as a fixture test so the same gap can't regress silently. |
| **FM-24-031** | Doc-lint failure is bypassed under deadline pressure | A merge-override/admin-bypass is used to ship past a failing doc-lint check 'just this once.' | Audit of merge history shows a bypass flag used on a PR with a failing doc-lint job. | High | Restrict bypass authority and require an explicit, logged justification for any doc-lint bypass, reviewed in the next retro — same discipline as bypassing a failing security check. | Fix the drift the bypass introduced in a fast-follow PR; track bypass frequency as a signal the check itself may be miscalibrated (too strict) if it happens often. |
| **FM-24-032** | New drift category isn't covered by any existing check | A new kind of doc-vs-reality mismatch is discovered that doesn't fit any row in the Checks table above. | Discovered via incident review or manual audit, not automatically — this is inherently a blind spot until named. | Low | Treat every discovered drift instance as a trigger to ask 'should this be a new doc-lint check,' not just a one-off fix. | Add the new check to the table above and implement it; this is the primary way this list of checks is expected to grow over time. |
