# Execution Pipeline

## Purpose

Traces the complete, end-to-end path of both an observation and a user
task through the system, tying together the individual service
descriptions in `service-architecture.md` into one concrete sequence.

## Scope

Two pipelines: the observation-to-memory pipeline (always running) and the
request-to-verified-result pipeline (triggered per user task). Internal
logic of each stage is documented in its owning service's page.

## Observation pipeline

```mermaid
flowchart LR
    OBS[Observer] --> NORM[Normalizer]
    NORM --> MW[Memory Writer]
    MW --> KGL[Knowledge Graph Linker]
    KGL --> EMB[Embedding Generator]
    EMB --> IDX[Index]
    IDX --> NOTIFY[Planner Notification]
    NOTIFY --> UI1[UI Update]
```

This pipeline runs continuously and asynchronously, independent of any
user request in flight. Every stage is idempotent with respect to
`message_id` (`communication-model.md`) so that a service restart mid-
pipeline does not corrupt or duplicate memory records.

## Request-to-result pipeline

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
    PL->>PL: Deterministic-first check (05-ai/deterministic-first.md)
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

Each step in the loop above may repeat (replanning) if verification
reports Unverified or Failed and the Planner determines recovery is
possible — see `docs/03-runtime/planner.md` and `docs/03-runtime/verifier.md`.

## Where risk-tier gating enters the pipeline

Between Tool Registry returning a tool and Executor being invoked, the
Permission Manager (`docs/03-runtime/permission-manager.md`) checks the
tool's declared risk tier and either allows execution to proceed
immediately, requires explicit user confirmation before proceeding, or
requires multi-step confirmation for critical-risk actions — this gate is
not optional and cannot be skipped by any caller, including the Planner
itself.

## Where the deterministic-first check enters the pipeline

The Planner's deterministic-first check happens before tool selection is
even requested from the Tool Registry for LLM-oriented tools — if a task
can be resolved by a deterministic function, the pipeline shortcuts
directly from Planner to Executor for that step without involving Context
Builder or the Model Router at all, which is why the "proportion of tasks
resolved without any LLM call" metric in
`docs/01-product/success-metrics.md` is measurable directly from pipeline
traces.

## Related documents

- `service-architecture.md` — the services referenced in the diagrams
  above
- `event-driven-architecture.md` — the event model underlying the
  observation pipeline
- `docs/03-runtime/planner.md`, `verifier.md` — full internal detail of
  the two most complex stages
