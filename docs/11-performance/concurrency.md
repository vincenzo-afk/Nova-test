# Concurrency

## Purpose

Consolidates NOVA's concurrency model — task-level concurrency limits,
resource locking, and agent instance isolation — into one reference,
tying together mechanisms detailed individually elsewhere.

## Scope

Cross-cutting concurrency behavior. Individual mechanisms (Scheduler
limits, Resource Manager locks) have their own detailed documents this
one indexes.

## Task-level concurrency

The Scheduler (`docs/03-runtime/scheduler.md`) bounds the number of
simultaneously executing tasks according to the resource budget in
`resource-usage.md`, with interactive tasks prioritized over background
tasks for dispatch, and starvation prevention ensuring a long-queued
background task is not indefinitely preempted.

## Resource-level concurrency

The Resource Manager (`docs/03-runtime/resource-manager.md`) enforces
exclusive-write locks on shared resources (files, windows, clipboard),
using batch lock acquisition per step to avoid deadlock, and a maximum
lock duration per risk tier as a backstop against a stuck task holding a
lock indefinitely.

## Agent-instance concurrency

Multiple agent instances (`docs/05-ai/planner-agent.md`) may run
concurrently for different steps or different tasks; their isolation from
each other is enforced logically — per-instance tool allowlists
(`docs/10-security/authorization.md`) and resource locks — rather than
through per-instance process isolation, a deliberate scope/overhead
trade-off given instances are short-lived and numerous
(`docs/10-security/sandboxing.md`).

## Read/write asymmetry

Read-only operations (queries against Memory, the Knowledge Graph, or
current World Model state) are never gated by the Resource Manager's
exclusive-lock model — locks exist specifically to serialize conflicting
writes, not to serialize all access, since unrestricted concurrent reads
introduce no consistency risk given the append-mostly, versioned nature
of the underlying storage (`docs/04-memory/memory-storage.md`).

## Consistency under concurrent writes

Where two tasks' steps could plausibly touch the same resource
simultaneously (e.g., two tasks both organizing files in the same
folder), the Resource Manager's lock queue (`docs/03-runtime/resource-manager.md`) serializes them — the second task's conflicting
step waits rather than proceeding against a resource mid-modification by
the first, eliminating the interleaved-write corruption risk this
project's foundational review identified as a gap in the original
concept.

## Related documents

- `docs/25-failure-modes/FM-16-resource-management-and-performance.md` — failure modes for this subsystem
- `docs/03-runtime/scheduler.md`, `resource-manager.md` — the primary
  mechanisms this document indexes
- `docs/05-ai/planner-agent.md` — agent instance concurrency
- `resource-usage.md` — the budget task-level concurrency limits derive
  from
