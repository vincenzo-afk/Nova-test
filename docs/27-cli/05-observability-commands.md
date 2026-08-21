# Observability Commands

These become invaluable once the system grows past what an AI agent or
developer can hold in their head — each maps directly to the
observability primitives in `docs/25-failure-modes/FM-17-observability.md`.

| Command | Purpose | Maps to |
|---|---|---|
| `nova logs` | Tail/query structured logs, filterable by component/correlation ID | `docs/13-devops/logging.md` |
| `nova traces` | Query distributed traces by correlation ID | `docs/13-devops/monitoring.md`, `FM-17-004` |
| `nova metrics` | Query metrics (latency, resource usage, error rates) | `docs/11-performance/` |
| `nova replay` | Replay a recorded event/task sequence against current code, for debugging or regression testing | `docs/12-testing/chaos-tests.md` |
| `nova events` | Tail the live event bus | `docs/26-system-reference/07-event-catalog.md` |
| `nova profile <task-id>` | Profile a running or completed task's resource/time breakdown per step | `docs/11-performance/resource-usage.md` |
| `nova benchmark` | Benchmark providers, prompts, tools, memory retrieval, workflows | `docs/11-performance/benchmarks.md` |
| `nova inspect <id>` | Inspect the full state of a task/plan/memory record at a point in time | `docs/03-runtime/task-manager.md` |
| `nova explain <error-id \| trace-id>` | Given an error ID or trace, produce a human-readable explanation and likely root cause | `docs/26-system-reference/06-error-catalog.md` |

## `nova explain` in detail

Given `nova explain NOVA-AI001`, the command:

1. Looks up the code in `docs/26-system-reference/06-error-catalog.md`.
2. Pulls the cross-referenced FM entry's Trigger/Mitigation/Recovery from
   `docs/25-failure-modes/`.
3. If given a specific trace/task ID rather than just a code, correlates
   the actual logged context (which provider, which step) against the
   general explanation to produce a specific, not generic, root-cause
   hypothesis.
4. Suggests the concrete next command (e.g., `nova repair`, `nova provider test <name>`) most likely to resolve it.

This is the CLI's most direct expression of the principle behind the
entire `docs/25-failure-modes/` catalog: every failure must be
explainable, not just loggable.

## `nova replay` in detail

Replays a captured event/task sequence against the *current* codebase —
distinct from simply re-reading a log — to answer "would this still fail
the same way after my fix," which is the fastest verification loop for a
bug that was hard to reproduce interactively. Replayed sequences run in
`nova sandbox` (see `docs/27-cli/07-hidden-gold-and-ci.md`) by default, never
against live user data.

## Related documents

- `docs/25-failure-modes/FM-17-observability.md` — the failure catalog
  this whole command group exists to make actionable
- `docs/26-system-reference/06-error-catalog.md`,
  `07-event-catalog.md` — the data `explain`/`events` surface

## Where This Breaks

Failure modes specific to this command group. Cross-referenced from `docs/25-failure-modes/FM-25-cli-infrastructure.md`, which indexes all CLI failure entries in one place.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-25-014** | `nova explain` gives a wrong or generic root-cause hypothesis | The correlation between error code and actual logged context is weak for a novel/compound failure not well-represented by any single FM entry. | User/agent applies the suggested fix and the issue persists. | Medium | Explicitly signal confidence level in `explain`'s output (`likely cause` vs. `possible cause`, borrowing the confidence-calibration discipline from `FM-05-014`) rather than always asserting certainty. | Fall back to `nova diagnostics` + manual investigation; feed the actual resolution back as a training example for improving future `explain` accuracy on that pattern. |
| **FM-25-015** | `nova replay` result doesn't actually match what would happen live, giving false confidence | Sandbox environment used for replay diverges from production environment (dependency versions, resource limits) in a way that changes the outcome. | `FM-08-015`-style environment-parity gap, surfaced here for the replay tool specifically. | Medium | Same mitigation as `FM-08-015`: environment parity between sandbox and production, verified periodically. | Treat a passing replay as necessary but not sufficient; run the real fix through the normal test/verification pipeline before trusting it fully. |
| **FM-25-016** | `nova events` tail overwhelms the operator during an event storm | See `FM-15-027` — the CLI surfaces the storm but provides no filtering fast enough to be useful mid-incident. | Operator reports `nova events` output scrolling too fast to read during an active incident. | Low | Default `nova events` to a rate-limited/sampled view during high-volume periods, with an explicit `--no-sample` override for when full fidelity is actually needed. | No system-level recovery needed; this is a CLI UX fix, tracked as a backlog item once observed. |
