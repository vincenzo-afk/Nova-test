# Deterministic Before Intelligent

## Purpose

The full specification of NOVA's primary architectural principle: for
every task, deterministic computation is preferred over AI reasoning, and
an LLM is invoked only when deterministic execution genuinely cannot
produce a single, high-confidence result.

## Scope

The decision criteria and worked examples for this principle in general.
The specific escalation path for genuinely ambiguous cases is
`ambiguity-resolution.md`; this document covers the first-line
determination of whether a task is deterministic at all.

## Why this is the primary principle, not one among equals

Every other AI-layer component (`ai-architecture.md`) exists to handle
the cases this principle does not resolve. It is listed first among the
five design principles specifically because it is the filter that keeps
the others — risk-based execution, memory-first design — cheap, fast, and
debuggable in practice; without it, they would still be architecturally
correct but expensive and slow to operate, since nearly everything would
route through an LLM call by default.

## What counts as deterministic

A task is deterministic if it can be fully resolved by: a direct
filesystem or OS API call, a parser (JSON, YAML, config formats), an
index lookup (`docs/04-memory/retrieval-engine.md`'s exact/keyword/entity
search paths), a native function (git commands, calculators, regex
engines), or a database/graph query with no ambiguity in what is being
asked for.

## What does not count as deterministic

A task requires an LLM if it genuinely requires natural language
understanding, synthesis across multiple sources, planning under
uncertainty, or disambiguation among multiple valid candidates with no
higher-confidence deterministic signal available. See
`ambiguity-resolution.md` for the precise decision flow that determines
this.

## Worked examples

| Request | Resolution |
|---|---|
| "Open VS Code" | Deterministic — direct application launch |
| "Git status" | Deterministic — direct CLI invocation |
| "Read config.json" | Deterministic — direct file read + parse |
| "Find my resume" | Deterministic search first; LLM only if multiple equally plausible candidates remain (top two results within `docs/04-memory/memory-ranking.md`'s 0.1 ambiguity margin) |
| "Summarize this project" | LLM — requires synthesis and natural language generation |
| "Plan how to migrate this codebase" | LLM — requires planning under uncertainty |
| "Which file is probably the one I edited yesterday?" | LLM — requires inference beyond a direct lookup |

## Measurability

Because the Planner's deterministic-first check
(`docs/03-runtime/planner.md`) happens before any AI-layer component is
even invoked, the proportion of tasks resolved without any LLM call is
directly measurable from pipeline traces
(`docs/02-architecture/execution-pipeline.md`) and is tracked as a
system-level success indicator in `docs/01-product/success-metrics.md` —
this proportion must not decrease as new tool integrations are added
over time; a decrease indicates new integrations are defaulting to LLM
resolution rather than implementing deterministic paths where they exist.

## Related documents

- `docs/25-failure-modes/FM-05-llm-core-and-ai-specific-failures.md` — failure modes for this subsystem
- `ambiguity-resolution.md` — the full decision flow for the "not clearly
  deterministic" case
- `docs/00-overview/design-principles.md` — this principle's place among
  the other four
- `docs/01-product/success-metrics.md` — how adherence is measured
