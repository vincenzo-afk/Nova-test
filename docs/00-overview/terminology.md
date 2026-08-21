# Terminology

## Purpose

Defines the core architectural concepts used throughout this repository,
in narrative form, so that every document can use these terms without
redefining them. For a flat alphabetical lookup instead, see `glossary.md`.

## Scope

Concepts specific to NOVA's architecture. General software engineering
terms (API, SDK, REST) are assumed known and are not redefined here unless
NOVA uses them in a non-standard way.

## Core concepts

**Runtime** — The always-running background process (and its constituent
services) that implements the Observe → Remember → Reason → Act → Verify
loop. "The runtime" refers to the whole system, not any single service.

**Observer** — A service that watches one specific source (filesystem,
browser, clipboard, etc.) and emits normalized events onto the
Communication Bus. Each observer is independently enabled/disabled by user
permission.

**Working Memory** — The shortest-lived memory tier, holding the current
task's active context. Cleared or promoted at the end of a task.

**Recent Memory** — Rolling history of recently completed conversations
and tasks, retained until summarized into Long-term Memory or the
Knowledge Graph.

**Long-term Memory** — Verified, durable facts and summaries retained
indefinitely (subject to user-controlled retention — see
`docs/04-memory/memory-lifecycle.md`, Tier 2), promoted from Recent Memory
after verification.

**Knowledge Graph** — The fixed-schema graph of entities (User, Project,
File, App, Task, Decision, Tool, etc.) and their relationships. The
ontology is versioned and closed — new node/edge types require an ADR, not
runtime invention.

**Archive** — Cold storage for memory that has aged out of active
retrieval tiers but has not been deleted; retrievable but not part of
default context assembly.

**Planner** — The service that converts a user goal into a sequence of
steps, deciding at each step whether the task is solvable deterministically
or requires an LLM call, per `docs/05-ai/ambiguity-resolution.md`.

**Model Router** — The deterministic (non-LLM) component that selects which
AI provider/model handles a given LLM call, based on task type, latency,
cost, privacy, and capability requirements.

**Tool** — Any registered, callable capability NOVA can invoke: a native
function, an API call, an MCP call, a CLI command, or a GUI/vision
interaction. Every tool is tagged with an execution tier (see Execution
Priority below) and a risk tier.

**Tool Registry** — The catalog of all available tools, their tiers, and
their permission requirements.

**Executor** — The service that actually invokes a selected tool and
returns a structured result.

**Verifier** — The service that checks, using ground-truth signals
wherever possible, whether an executed action produced its intended
outcome. A task is "unverified," not "successful," if evidence is
insufficient — verification never assumes success.

**Risk Tier** — One of: read-only, reversible-write, destructive/
irreversible. Determines what confirmation, if any, is required before an
action executes. See `docs/10-security/permissions.md` (Tier 3).

**Execution Priority** — The fixed ordering NOVA follows when choosing how
to perform an action: Native Runtime → Internal Functions → API → MCP →
CLI → Accessibility APIs → Vision → Keyboard/Mouse. A lower-priority
(riskier, less reliable) method is only used when every higher-priority
method is unavailable for that specific task.

**Agent** — An instantiation of the planning/tool-calling loop scoped to a
specific task with a specific tool allowlist. NOVA does not implement
separate runtimes per "agent type" — a single parameterized agent runtime
is configured differently per task (see `docs/05-ai/planner-agent.md`,
Tier 2).

**MCP (Model Context Protocol)** — The protocol NOVA uses to connect to
external tool/resource servers in a standardized way, as one tier in the
execution priority chain.

**Deterministic Before Intelligent** — The principle that an LLM is
invoked only when deterministic execution cannot produce a single,
high-confidence result. See `docs/00-overview/design-principles.md`.

**Task Success Score** — The measurable definition of whether an action
succeeded: goal achieved AND verification passed AND no rollback occurred
AND (where applicable) user approval given. See
`docs/01-product/success-metrics.md`.

## Related documents

- `glossary.md` — flat alphabetical reference including acronyms
- `design-principles.md` — how these concepts combine into architectural
  rules
