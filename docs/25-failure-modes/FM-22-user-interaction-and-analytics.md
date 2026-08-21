# FM-22: User Interaction & Analytics

## Purpose

Failures at the human-facing edge of the system, and in how NOVA measures its own usage/behavior.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/09-ui/ui-overview.md` - `docs/09-ui/chat.md` - `docs/23-autonomy/personal-analytics.md` - `docs/09-ui/command-palette.md` - `docs/09-ui/graph-explorer.md` - `docs/09-ui/memory-explorer.md` - `docs/09-ui/overlay.md` - `docs/09-ui/task-monitor.md` - `docs/09-ui/tray.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-22-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-22-001** | Ambiguous commands | User request underspecifies a necessary detail (which file, which account, what timeframe). | Ambiguity score from `docs/05-ai/ambiguity-resolution.md` exceeds threshold. | Medium | Ask a targeted clarifying question rather than guessing, when ambiguity is high and the action has real consequences. | No system-level recovery beyond the clarifying-question flow itself; track ambiguity patterns to improve future default-assumption quality. |
| **FM-22-002** | Contradictory requests | User's request conflicts with a stated preference or an earlier instruction in the same session. | Contradiction detected between current request and stored preference/instruction. | Low | Surface the contradiction explicitly rather than silently picking one interpretation. | Ask which should take precedence; update the stored preference if the user confirms the change is intentional. |
| **FM-22-003** | Missing information | Request requires information the user hasn't provided and NOVA doesn't otherwise have (e.g. an account number). | Required-field check for the action fails. | Low | Prompt for exactly the missing piece rather than blocking with a generic 'more info needed'. | No system-level recovery; this is expected, handled interaction flow, not a bug. |
| **FM-22-004** | Accidental approval | User taps/says approval for something they didn't mean to approve (misclick, misheard voice command). | User immediately follows up correcting/reversing the approval. | Medium | Undo window for recently-approved actions before/shortly after execution, for actions where a brief delay is acceptable. | Honor the undo if within the window and the action is reversible; if already executed and irreversible, this underscores why a delay window matters for consequential actions. |
| **FM-22-005** | Wrong confirmation | Confirmation dialog's content doesn't clearly match the action about to be taken (see FM-18-015's approval-scope-mismatch pattern, applied to routine confirmations too). | User reports confirming one thing and a different thing happening. | Medium | Same principle as FM-18-015: confirmation-dialog content generated from the exact action spec, not a separately-authored summary. | Investigate and fix the specific dialog-generation gap; treat any executed-but-not-actually-confirmed action per the relevant incident path for its consequence level. |
| **FM-22-006** | Wrong statistics (analytics) | Aggregation bug or a metric-definition change not applied consistently produces incorrect analytics output. | Cross-check against raw event counts disagrees with the reported aggregate. | Low | Test analytics pipelines against known-good sample data, same rigor as any other data pipeline. | Recompute from raw events once the bug is fixed; communicate the correction if the wrong figure was already surfaced to the user. |
| **FM-22-007** | Wrong aggregation | Aggregation window/grouping logic error (e.g. off-by-one day boundary, wrong timezone for a 'daily' rollup). | Spot-check of a specific day/period's rollup against raw events disagrees. | Low | Explicit, tested boundary logic for every aggregation window, using the same UTC-storage/locale-display discipline as FM-13-015. | Recompute the specific affected windows once the boundary bug is fixed. |
| **FM-22-008** | Duplicate events (analytics) | See FM-15-025, applied to analytics ingestion specifically — inflates counts if not deduplicated. | Analytics count for an event type is implausibly higher than the corresponding raw system event count. | Low | Idempotent analytics-event ingestion keyed by event ID, same as FM-15-025's general pattern. | Deduplicate and recompute affected aggregates. |
| **FM-22-009** | Missing events (analytics) | See FM-15-024, applied to analytics specifically — undercounts if events are dropped before reaching the analytics pipeline. | Analytics count is implausibly lower than the corresponding raw system event count. | Low | Same at-least-once delivery guarantee as FM-15-024 applied to the analytics event stream specifically. | Backfill from the raw system event log if retained; otherwise treat as a known gap for that window. |
| **FM-22-010** | Time calculation errors (analytics) | Duration/elapsed-time metrics computed incorrectly across a DST boundary or timezone change. | Spot-check of a duration metric around a known DST transition date disagrees with manual calculation. | Low | Compute durations from UTC timestamps, never from locale-displayed wall-clock times, per `docs/00-overview/time-semantics.md`. | Recompute the specific affected metrics using UTC-based calculation. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Ambiguous commands (FM-22-001) that don't route through `docs/05-ai/ambiguity-resolution.md` become wrong plans (FM-02-001) become false success reports (FM-05-016) — this is the canonical failure chain from a fuzzy human request to a confidently-wrong autonomous outcome, and clarification at the very first step is the cheapest place to break the chain.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
