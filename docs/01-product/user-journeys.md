# User Journeys

## Purpose

Describes how a user experiences NOVA over time, end to end, rather than
as isolated use cases. This exists specifically to force answers to the
"cold start" and "what happens when something goes wrong" questions that
a capability list alone does not surface.

## Scope

Three journeys: first install, ordinary daily use, and task failure/
recovery. All three assume the Phase 2 feature set (whitelisted execution)
unless noted.

## Journey 1: First install (cold start)

1. User installs NOVA on Windows. No background observation begins before
   this step.
2. NOVA presents the permission center (`docs/10-security/permissions.md`,
   Tier 3) with each observation source itemized and off by default.
3. User grants permissions selectively (e.g., a specific set of project
   folders, not the entire filesystem).
4. NOVA performs an initial scan limited to granted sources: installed
   applications, currently open projects/files matching granted folders,
   and any documents the user explicitly imports.
5. The Knowledge Graph is populated with initial entities from this scan.
   NOVA is immediately queryable ("what applications do I have installed
   that touch Python") even though its history is empty — this is a
   deliberate design goal (see `docs/00-overview/goals.md`, Phase 1 goal
   1) specifically so the cold-start period is not a dead experience.
6. Memory continuously deepens from this point through ordinary use;
   there is no separate "training period" the user has to wait through.

## Journey 2: Ordinary daily use

1. User opens the command palette and asks a question or issues a task.
2. The Planner checks Working/Recent Memory and the Knowledge Graph for
   relevant context before considering any new reasoning.
3. For a deterministic task (file open, git command), the Executor runs
   it immediately at its risk-appropriate confirmation level; the UI shows
   the action and its verification result without requiring further input.
4. For a task requiring reasoning (summarization, planning), the UI shows
   a lightweight "thinking" state via the same progress mechanism used for
   longer workflows (see Journey 3), and the LLM call is scoped only to
   the sub-step that actually needs it, not the whole task.
5. The interaction and its outcome are written to Recent Memory
   immediately; nothing waits for an end-of-day batch process.

## Journey 3: Task failure and recovery

1. User issues a multi-step task. A step fails partway through (e.g., a
   cloud provider call times out).
2. Execution pauses at the failed step. Completed steps remain recorded
   and are not rolled back automatically unless the failure specifically
   requires it for consistency.
3. The Planner attempts recovery: retry, an alternate execution method
   from the priority chain, or an alternate provider via the Model Router.
4. If recovery is not possible, NOVA reports the incomplete state
   explicitly — which steps completed, which failed, and why — rather
   than a generic error. The user is never left inferring state from
   silence.
5. If the user asked for something ambiguous that only became apparent
   mid-task (e.g., two files could have matched an earlier step), NOVA
   surfaces the specific ambiguity rather than guessing silently and
   continuing.

## What these journeys deliberately exclude

Multi-device continuity (e.g., "start on one machine, continue on
another") is not part of any journey in the current phase — see
`docs/00-overview/non-goals.md`.

## Related documents

- `use-cases.md` — the individual tasks referenced within these journeys
- `docs/03-runtime/verifier.md` (Tier 2) — how failure detection in
  Journey 3 actually works
- `docs/10-security/permissions.md` (Tier 3) — the permission center in
  Journey 1
