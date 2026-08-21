# ADR-0003: Runtime Architecture

## Status
Accepted

## Context

The original concept described eight architectural "layers" (Observer,
State, Memory, Knowledge Graph, Planner, Agent, Execution, Verification)
without specifying process topology, failure-domain boundaries, or how
services communicate. The foundational review noted that a monolithic
process risks one experimental component's failure (e.g., an
early-stage vision-control feature) taking down mature, depended-upon
components (Memory, Knowledge Graph).

## Decision

NOVA runs as a single Windows background service hosting multiple
independently-supervised service processes, communicating over one
Communication Bus (local named-pipe IPC) using a versioned message
envelope. Each service is its own OS process with its own failure domain;
a crash in one is isolated from and does not block the others, and is
automatically restarted by a Runtime Manager with exponential backoff and
a degraded-status escalation path. The UI Layer runs as a separate,
unprivileged process communicating only through the API Gateway.

## Alternatives Considered

- **A single monolithic process** — rejected because it violates the
  failure-isolation goal directly; one component's crash would risk the
  whole system's availability.
- **Fully separate installed Windows services per component** —
  rejected as disproportionate operational overhead (ten independent
  install/update/permission lifecycles) for a single-machine,
  single-user product with no scenario requiring independent per-service
  installation.
- **Direct in-process function calls between services instead of a
  message bus** — rejected because it would recreate monolith-style
  tight coupling even within a nominally "modular" codebase, undermining
  the intended failure isolation.

## Consequences

This decision makes it possible for the least mature capability (GUI/
vision execution, Phase 4) to fail without affecting Memory or Knowledge
Graph availability, and makes each service independently testable
(`docs/12-testing/unit-tests.md`). It adds message-passing overhead and
requires disciplined schema versioning
(`docs/02-architecture/communication-model.md`) compared to direct
function calls, which is an accepted trade-off given the reliability
benefit.

## Related Documents

- `docs/02-architecture/system-architecture.md`,
  `communication-model.md` — full implementation detail
- `docs/03-runtime/runtime-manager.md` — the supervision mechanism this
  ADR establishes
