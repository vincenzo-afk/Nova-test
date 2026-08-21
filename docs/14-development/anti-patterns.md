# Anti-Patterns

## Purpose

Consolidates known incorrect-implementation patterns for plugins, agents,
and memory in one reference, so a contributor can check "don't do this"
before starting new work rather than discovering the pattern is wrong
only during review.

## Scope

Anti-patterns for the three areas most prone to subtle misuse: plugins,
agent instances, and memory. Each entry pairs the anti-pattern with the
correct approach and the document that specifies it.

## Plugin anti-patterns

**Wrong:** A plugin's tool checks its own permission scope internally
before acting, and skips calling the Permission Manager if it believes
it's already authorized.
**Right:** Every tool invocation passes through the Permission Manager
gate unconditionally (`docs/03-runtime/permission-manager.md`); a plugin
never makes its own authorization determination.

**Wrong:** A plugin update silently expands its permission scope and
assumes prior approval still covers it.
**Right:** Any permission-expanding update requires fresh review
(`docs/16-extensibility/plugin-permissions.md`).

**Wrong:** A plugin registers a tool with `verification_signal: "none"`
and is configured to run unattended anyway via a plugin-specific
override.
**Right:** No override exists for this; a tool without a real
verification signal is confirmation-required-only, full stop
(`docs/06-tools/tool-interface.md`).

## Agent (agent instance) anti-patterns

**Wrong:** An agent instance, partway through its scoped sub-task,
invokes a tool outside its configured allowlist because the Planner's
higher-level goal seems to justify it.
**Right:** An agent instance's tool allowlist is fixed for its lifetime
(`docs/05-ai/planner-agent.md`); a need for a broader tool set requires
the Planner to spawn a differently-scoped instance or replan, not the
instance exceeding its own configuration.

**Wrong:** An agent instance's scratch memory is merged into Recent
Memory wholesale at task completion, including unverified intermediate
reasoning.
**Right:** Only Verifier-confirmed outcomes are promoted from scratch
memory into durable memory (`docs/04-memory/memory-types.md`); the rest
is discarded.

**Wrong:** Two concurrently running agent instances both act on the same
file without acquiring a lock, on the assumption that "they're both part
of the same overall task so it's fine."
**Right:** Resource locking is required regardless of whether contending
instances belong to the same or different tasks
(`docs/03-runtime/resource-manager.md`).

## Memory anti-patterns

**Wrong:** A new relationship type is added to the Knowledge Graph
directly by code handling a novel situation, since the fixed ontology
"doesn't quite cover this case."
**Right:** A new type is proposed and queued for review
(`docs/04-memory/ontology.md`); it is never added directly, no matter how
narrow or justified the specific case seems.

**Wrong:** A contradictory new statement (e.g., a reversed preference)
overwrites the prior record in place, discarding it.
**Right:** The prior record is retained, marked superseded
(`docs/04-memory/memory-conflict-resolution.md`), not deleted.

**Wrong:** A memory record's confidence is treated as permanent once set,
never re-evaluated as corroborating or contradicting evidence appears.
**Right:** Confidence and verification status evolve over a record's
lifetime (`docs/04-memory/memory-confidence.md`).

**Wrong:** Raw observation data is retained indefinitely "in case it's
useful later."
**Right:** Every record has an assigned expiration policy tier at write
time (`docs/04-memory/memory-lifecycle.md`); indefinite retention is
never the default.

## Related documents

- `docs/16-extensibility/plugin-permissions.md`,
  `docs/06-tools/tool-interface.md` — the correct plugin patterns
  referenced above
- `docs/05-ai/planner-agent.md`, `docs/03-runtime/resource-manager.md` —
  the correct agent-instance patterns
- `docs/04-memory/ontology.md`, `memory-conflict-resolution.md`,
  `memory-confidence.md`, `memory-lifecycle.md` — the correct memory
  patterns
