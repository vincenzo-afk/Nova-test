# Version Compatibility Matrix

## Purpose

States which combinations of NOVA core version, plugin API version,
configuration schema version, and provider interface version are
guaranteed to work together — so an upgrade, a plugin install, or a
provider integration can be checked against a table instead of
discovered by trial and error.

## Matrix

| NOVA Version | Plugin API Version | Config Schema Version | Provider Interface Version | Notes |
|---|---|---|---|---|
| v1.x | 1.0 | 1.0 | 1.0 | Original single-machine, single-user architecture (`docs/15-decisions/adr-0001-project-scope.md`) |
| v5.0+ | 1.0 – 1.x (compatible) | 2.0 | 2.0 | v5 is structural evolution, not a fork — same runtime/memory/permission core as v1, per `docs/15-decisions/adr-0008-v5-architecture-evolution.md`; plugin API stayed backward-compatible, provider interface became provider-agnostic |
| v5.x (current) | 1.x | 2.x | 2.x | Config schema 2.x is additive-only over 2.0 (new optional keys); no 2.x config is rejected by any v5.x release |

## Compatibility rules

- **Plugin API**: Minor version bumps are additive-only — a plugin built
  against 1.0 continues to work against 1.5. A major bump (2.0) would
  require the deprecation-window process in
  `docs/16-extensibility/plugin-versioning.md` before any 1.x plugin
  stops loading.
- **Config schema**: Additive-only within a major version, per
  `docs/14-development/configuration-schema.md`'s established-keys
  append model — a config file with only 2.0-era keys loads fine under
  any 2.x NOVA release; a config file with 2.x-only keys is not
  guaranteed to load under a 2.0-only release (forward compatibility is
  not promised, only backward).
- **Provider interface**: Version-negotiated per-connection (see
  `docs/25-failure-modes/FM-04-015`, capability version mismatch) — a
  provider need not match NOVA's exact interface version as long as a
  mutually-supported version exists.
- **Knowledge-graph ontology**: Fixed and versioned independently of the
  four columns above, per `adr-0008`'s explicit note that the ontology
  restriction stands even as other v5 boundaries relaxed.

## Cross-version data compatibility

Memory/graph data written under an older schema is handled via the
migration chain described in `docs/25-failure-modes/FM-20-009` through `FM-20-013` (old memories incompatible, migration failures, legacy data
unreadable, backward-compatibility breaks) — this matrix states which
*code* versions are compatible; that failure-mode file states what
happens to *data* across a version boundary and how it's kept readable.

## Related documents

- `docs/15-decisions/adr-0008-v5-architecture-evolution.md` — the
  decision record this matrix's v1→v5 row is derived from
- `docs/16-extensibility/plugin-versioning.md` — plugin API compatibility detail
- `docs/14-development/configuration-schema.md` — config schema versioning detail
- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — what
  happens when a compatibility boundary is crossed incorrectly

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-025** | Matrix not updated when a new version ships | A new NOVA release changes one of the four version columns and this table isn't updated in the same release. | Release checklist (`docs/14-development/release-checklist.md`) includes a mandatory line-item to update this matrix. | Medium | Make this matrix update a release-checklist gate, not an optional follow-up task. | Backfill the missing row immediately; audit whether any compatibility claim made elsewhere (marketplace listings, plugin manifests) needs correcting too. |
| **FM-24-026** | Compatibility claimed here doesn't hold in practice | A row states two versions are compatible but an actual integration between them fails. | Automated compatibility test matrix (running real cross-version integration tests, not just documenting claims) catches the discrepancy before release. | High | Every cell in this matrix must correspond to an automated test that actually exercises that version pairing, not just an assertion. | Correct the matrix to reflect reality immediately; treat the false compatibility claim as equivalent in severity to `FM-20-014`, backward compatibility break. |
