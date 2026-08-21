# Memory Types

## Purpose

Details exactly what is stored in each memory tier introduced in
`memory-architecture.md`, including agent scratch memory, which is a
special-cased fifth memory type scoped to a single task rather than the
user's overall workspace.

## Scope

Content and structure per tier. Storage engine choice is
`memory-storage.md`; lifecycle transitions are `memory-lifecycle.md`.

## Working Memory

Contents: the active task's goal, the plan being executed, intermediate
step results not yet finalized, and any context assembled specifically
for this task by the Context Builder (`docs/05-ai/context-builder.md`).
Scope: one task. Lifetime: cleared or promoted when the task reaches a
terminal state (`docs/03-runtime/task-manager.md`).

## Recent Memory

Contents: completed conversations and tasks, in enough detail to
reconstruct what happened and why, but not yet compressed into a
long-term summary. Includes the full step history of recently completed
tasks (tool calls, verification outcomes) for near-term "what did you
just do" queries. Scope: rolling window, configurable, defaulting to
recent weeks of activity. Lifetime: until promoted to Long-term Memory or
the Knowledge Graph per the trigger conditions in `memory-lifecycle.md`.

## Long-term Memory

Contents: verified facts, decisions, and summaries that remain useful
beyond the task or session that produced them — e.g., "the database
choice for project X was Postgres, decided on this date, for this
reason." Distinguished from Recent Memory by having passed through
verification and summarization, not merely by age. Scope: indefinite,
subject to user-controlled retention (`memory-lifecycle.md`).

## Knowledge Graph

Not a memory "tier" in the recency sense — a structured index of entities
and relationships extracted from Recent and Long-term Memory. See
`knowledge-graph.md` and `ontology.md`.

## Archive

Contents: Long-term Memory records that have aged past the point of being
included in default context assembly, but are retained and retrievable
on explicit request (e.g., "what did I decide about this two years ago").
Distinguishing Archive from deletion matters because a user must be
able to intentionally reach back that far without NOVA having discarded
the information outright.

## User Preferences

A specialized subset of Long-term Memory: individual preference records
with the confidence-scoring model described in `memory-ranking.md`
(frequency, consistency, recency, explicit statement, correction history).
Only high-confidence preferences are treated as durable defaults; lower-
confidence ones are retained but weighted accordingly during retrieval.

## Agent Scratch Memory

Contents: temporary reasoning state private to a single agent instance
during a single task (`docs/05-ai/planner-agent.md`) — intermediate
hypotheses, partial tool results not yet verified. Scope: one agent
instance, one task. Lifetime: discarded when the task ends, except for
whatever portion the Verifier has confirmed and explicitly promotes into
Recent Memory — unverified scratch reasoning is never merged into durable
memory.

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `memory-architecture.md` — how these types relate structurally
- `memory-lifecycle.md` — the promotion/demotion triggers between types
- `memory-ranking.md` — the confidence model referenced for User
  Preferences
