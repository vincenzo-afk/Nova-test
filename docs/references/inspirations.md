# Inspirations

## Purpose

Names the categories of existing tools and patterns that directly
informed specific NOVA architectural decisions, so a contributor
encountering an unfamiliar design choice can understand its lineage
without needing to have been part of the original design discussion.

## Scope

Design-pattern-level influence, described categorically rather than as
specific product endorsements or comparisons — direct product comparisons
are `comparisons.md`.

## Influences by component

- **Memory and retrieval** — the general pattern of tiered memory
  (working/short-term/long-term) with a structured knowledge layer on
  top draws from the broader category of agent-memory frameworks
  explored in recent AI-agent research and tooling; NOVA's specific
  contribution is the fixed-schema constraint on the knowledge layer
  (`docs/04-memory/ontology.md`), a deliberate departure from more
  schema-flexible approaches in that category, made specifically to
  avoid the drift risk identified in this project's foundational review.
- **Multi-agent orchestration** — the pattern of a planner delegating to
  specialized sub-agents is common across contemporary agent-framework
  tooling; NOVA's specific contribution is collapsing that into one
  parameterized runtime (`docs/05-ai/planner-agent.md`) rather than
  separately implemented agent types, a deliberate simplification
  relative to that broader pattern.
- **Tool orchestration and MCP** — NOVA's tool registry and execution-tier
  model builds directly on the Model Context Protocol as a standardized
  integration layer (`docs/06-tools/mcp.md`), extending it with the
  execution-priority chain and risk-tiering that sit above and around it.
- **Desktop automation / RPA** — the category of robotic process
  automation tooling informs NOVA's treatment of GUI/vision control as a
  distinct, high-maintenance-burden capability requiring an explicit
  allow-list (`docs/06-tools/vision.md`) rather than a general-purpose
  capability, reflecting known reliability lessons from that category
  rather than assuming NOVA is exempt from them.

## What is deliberately not imitated

General-purpose, unrestricted computer-use agents that treat GUI
automation as a first-choice, general-purpose capability are a pattern
NOVA deliberately does not follow — the execution-priority chain
(`docs/06-tools/execution-priority.md`) exists specifically to invert that
default, preferring structured methods and treating GUI control as a
last resort.

## Related documents

- `docs/04-memory/ontology.md`, `docs/05-ai/planner-agent.md`,
  `docs/06-tools/mcp.md`, `docs/06-tools/vision.md` — the components
  these influences shaped
- `comparisons.md` — direct comparison against specific existing tool
  categories
