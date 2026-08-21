# Error Handling, Release Tagging & Performance Rules

## Status: full detail — summarized within the governance folder

The error-handling pattern this file locks (Result pattern default) is
summarized in `docs/00-implementation-governance/canonical-patterns.md`;
this file remains the full detail, including the release-tagging
convention and performance ceilings, which have no separate
governance-folder summary of their own. If a summary and this file ever
disagree, this file is correct — fix the summary, per
`docs/00-implementation-governance/documentation-precedence.md`.

## Purpose

Closes the remaining, specifically *positive* rules (as opposed to the
"what breaks" framing already covered) for Sections 17, 20, and 21 of
the second master outline: the exact error-handling pattern used
codebase-wide, the release-tagging convention that complements
`branching.md`, and the hard numeric performance ceilings that
complement `docs/39-performance-budgets/`.

## Scope

Positive, prescriptive rules only. Failure-mode/anti-pattern framing for
these same topics remains in
`docs/45-code-perfection-failure-modes/11-error-handling-and-logging.md`;
this document states what to do, that document states what not to do —
both are binding.

## Error handling pattern (the positive rule)

NOVA uses the **Result pattern**, not exceptions, for any operation whose
failure is an expected, handleable outcome:

- **Result pattern (default):** functions that can fail in an expected
  way (validation failure, not-found, permission denied) return
  `{ ok: true, value } | { ok: false, error }` rather than throwing.
  This applies to every internal API operation
  (`17-event-and-internal-api-contracts.md`), every tool execution
  result (`docs/06-tools/tool-interface.md`), and every Verifier
  verdict.
- **Throw (exception, restricted use):** reserved for genuinely
  unexpected, non-recoverable conditions (programming errors, invariant
  violations) that must propagate and halt the current operation
  loudly — a violation of `system-invariants.md` is thrown, not
  returned as a Result, precisely so it cannot be silently swallowed by
  a caller that only checks `ok`.
- **Error codes:** every `error` in a Result and every thrown exception carries a stable code from `docs/26-system-reference/06-error-catalog.md`
  — a new error condition is not introduced without a corresponding
  catalog entry.
- **User-facing messages vs. developer messages:** always distinct
  fields — the user-facing message never includes a stack trace,
  internal ID, or raw SQL (per the existing landmine list); the
  developer message includes everything needed to debug, logged but
  never displayed.
- **Retry and recovery:** governed by
  `19-ordering-concurrency-and-retry-rules.md` — an error's Result
  object states whether it is retryable, so callers don't have to infer
  it from the error code alone.

## Release tagging convention

Complementing `branching.md`'s branch/PR/commit rules:

- **Tag format:** `v<major>.<minor>.<patch>`, applied to `main` only, at
  the same commit that completes a phase merge
  (`branching.md`)'s "phase branch → `main`" step.
- **Major:** a breaking change per any policy in
  `20-versioning-contracts.md`.
- **Minor:** a new capability, tool, or feature that is additive and
  non-breaking.
- **Patch:** a fix with no contract or behavior change beyond the
  defect itself.
- **Pre-release tags:** `v<version>-rc.<n>` for release-candidate builds
  validated against the full checklist
  (`docs/12-testing/validation.md`) before promotion to a final tag.

## Performance rules (hard ceilings)

Complementing the numeric targets already in
`docs/39-performance-budgets/` (chat first-token latency, memory query
latency, cold start), the following ceilings apply and block release if
exceeded, per `docs/39-performance-budgets/benchmarks.md`:

| Resource | Ceiling |
|---|---|
| Desktop renderer bundle size (initial load, gzipped) | 2 MB |
| Desktop renderer bundle size (total, including lazy chunks) | 8 MB |
| CLI binary size | 50 MB |
| Idle memory footprint (core services, no active task) | per `docs/39-performance-budgets/memory-usage.md` |
| Idle CPU usage (no active task, steady state) | <1% sustained |
| Android companion app size | 30 MB |

A change that would exceed any ceiling above is either optimized before
merge or explicitly re-budgeted via ADR
(`docs/15-decisions/`) — it is never merged silently over budget.

## Relationship to existing documents

This document adds the specific numbers and the positive error-handling
pattern choice; it does not replace
`docs/13-devops/logging.md`, `docs/45-code-perfection-failure-modes/11-error-handling-and-logging.md`,
or `docs/39-performance-budgets/`, all of which remain the canonical
home for their respective deeper detail.
