# Diagram: Memory Architecture

## Purpose

Standalone reference to the four-tier memory flow and lifecycle
diagrams.

## Source

Authoritative in `docs/04-memory/memory-architecture.md` and `memory-lifecycle.md`.

## Tier flow diagram

```mermaid
flowchart LR
    OBS[Observer events /<br/>Task outcomes] --> WM[Working Memory]
    WM -->|task/conversation ends| RM[Recent Memory]
    RM -->|verified + stable| LM[Long-term Memory]
    RM -->|entities extracted| KG[Knowledge Graph]
    LM -->|aged out| ARC[Archive]
    LM --> KG
```

## Lifecycle diagram

```mermaid
flowchart TD
    A[Observation / task outcome] --> B[Working Memory]
    B -->|task ends| C{Successfully completed<br/>or meaningfully concluded?}
    C -->|Yes| D[Recent Memory]
    C -->|No / trivial| E[Discarded]
    D --> F{Memory becomes stable:<br/>task completed, conversation<br/>finished, session closed}
    F -->|Yes| G[Summarization triggered]
    G --> H[Long-term Memory]
    G --> I[Entities extracted into<br/>Knowledge Graph]
    H -->|ages past active window| J[Archive]
    J -->|user-requested deletion| K[Deleted]
```

## Reading notes

The two diagrams are complementary, not redundant: the tier flow diagram
shows structural relationships between tiers; the lifecycle diagram shows
the triggers and conditions governing movement between them. Note that
"Discarded" (top diagram) applies only to trivial, non-meaningful Working
Memory content — it is distinct from the user-controlled deletion path
reachable only from Archive, per `docs/04-memory/memory-lifecycle.md`.

## Related documents

- `docs/04-memory/memory-architecture.md`, `memory-lifecycle.md` — the
  full specifications these diagrams illustrate
- `knowledge-graph.md` (this folder) — the graph these tiers feed
