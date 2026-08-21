# Resource Usage

## Purpose

The detailed resource budget breakdown underlying the summary figures in
`performance-goals.md`, specifying how NOVA's CPU/RAM footprint is
allocated across services and enforced so the system never visibly
degrades the user's own foreground work.

## Scope

Resource budget allocation and enforcement. Summary targets are
`performance-goals.md`; scaling behavior as data grows is `scalability.md`.

## Idle budget allocation

At idle (no active task), the combined budget across all supervised
services is under 3% CPU and under 600MB RAM — this aggregate ceiling is
the hard, enforced contract. Per-service allocation within that ceiling
is **IMPLEMENTATION-DEFINED**: each supervised service (Observer
services, Memory/Knowledge Graph, Runtime Manager, Scheduler, Task
Manager, State Manager) must have its own configured RAM ceiling that
the Runtime Manager enforces individually (per the Self-monitoring
section below), and those individual ceilings must sum to no more than
the 600MB aggregate — but the specific number assigned to each service
is an implementation-tuning parameter set empirically against real
profiling data, the same class of deliberate non-fabrication as
`docs/04-memory/memory-confidence.md`'s coefficients, not invented here
before that data exists. What is NOT implementation-defined: every
service must have *some* explicit, enforced individual ceiling — "the
services share a pool with no per-service limit" is not a valid reading
of this budget, since that would let one runaway service silently
consume the entire aggregate before the aggregate check ever fires.
Qualitatively, Observer services take the largest idle-time share
(continuous event capture); Memory/Knowledge Graph services are
moderate (occasional background indexing); Runtime Manager, Scheduler,
Task Manager, and State Manager are minimal at idle.

## Active-task budget

During active task execution, resource usage scales dynamically rather
than being capped at the idle figures — but per `performance-goals.md`,
NOVA must never monopolize the system. This is enforced by the Scheduler
(`docs/03-runtime/scheduler.md`) capping concurrent task execution and by
each service respecting OS-level process priority settings that keep
NOVA's foreground-visible impact secondary to the user's own actively
focused application.

## Background job budgeting

Indexing, embedding generation, and summarization
(`docs/04-memory/indexing.md`, `memory-lifecycle.md`) run at low OS
process priority and are explicitly designed to yield to foreground user
activity — detected via the World Model's activity signal
(`docs/03-runtime/world-model.md`) — rather than competing for CPU at
equal priority with whatever the user is actively doing.

## Self-monitoring and threshold alerting

The Runtime Manager (`docs/03-runtime/runtime-manager.md`) tracks actual
resource usage against these budgets continuously and surfaces a
degraded-status signal to the Tray UI (`docs/09-ui/tray.md`) if any
service persistently exceeds its allocation — this is the practical
enforcement mechanism, not merely a target stated in documentation with
no operational check behind it.

## Storage growth budget

While CPU/RAM are bounded as above, storage growth (`docs/04-memory/memory-storage.md`) is not artificially capped, since retention is a
user-controlled choice (`docs/04-memory/timeline.md`) rather than a
performance constraint — storage usage is surfaced to the user (via the
Memory Explorer, `docs/09-ui/memory-explorer.md`) so they can make an
informed retention decision rather than being silently capped without
visibility.

## Related documents

- `docs/25-failure-modes/FM-16-resource-management-and-performance.md` — failure modes for this subsystem
- `performance-goals.md` — the summary targets this document details
- `docs/03-runtime/scheduler.md`, `runtime-manager.md` — the enforcement
  mechanisms
- `docs/04-memory/memory-lifecycle.md` — background job scheduling this
  budget constrains
