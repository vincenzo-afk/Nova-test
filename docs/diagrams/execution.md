# Diagram: Execution Pipeline

## Purpose

Standalone reference to the request-to-verified-result pipeline and the
execution-priority chain.

## Source

Authoritative in `docs/02-architecture/execution-pipeline.md` and `docs/06-tools/execution-priority.md`.

## Request-to-result sequence

```mermaid
sequenceDiagram
    participant UI as UI Layer
    participant GW as API Gateway
    participant TM as Task Manager
    participant PL as Planner
    participant CTX as Context Builder
    participant TR as Tool Registry
    participant EX as Executor
    participant VF as Verifier
    participant MEM as Memory

    UI->>GW: User request
    GW->>TM: Create task
    TM->>PL: Request plan
    PL->>CTX: Build context from memory/graph
    CTX-->>PL: Assembled context
    PL->>PL: Deterministic-first check
    PL->>TR: Select tool for step
    TR-->>PL: Tool + risk tier + execution tier
    PL->>EX: Execute step
    EX-->>PL: Structured result
    PL->>VF: Request verification
    VF-->>PL: Verified / Unverified / Failed
    PL->>TM: Report step outcome
    TM->>MEM: Write task outcome
    TM->>GW: Task status update
    GW->>UI: Rendered result
```

## Execution priority chain

```mermaid
flowchart TD
    A[Native Runtime] --> B[Internal Functions]
    B --> C[API]
    C --> D[MCP]
    D --> E[CLI]
    E --> F[Accessibility APIs]
    F --> G[Vision]
    G --> H[Keyboard / Mouse]
```

## Reading notes

In the sequence diagram, the Permission Manager gate (not shown as a
separate participant here for visual simplicity) sits between Tool
Registry's response and Executor's invocation for every step, per
`docs/03-runtime/permission-manager.md` — it is omitted from this
diagram only for readability, not because it is optional; see
`docs/02-architecture/execution-pipeline.md` for the complete,
gate-inclusive description.

## Related documents

- `docs/02-architecture/execution-pipeline.md`,
  `docs/06-tools/execution-priority.md` — the full specifications these
  diagrams illustrate
- `docs/03-runtime/permission-manager.md` — the gate omitted here for
  visual simplicity
