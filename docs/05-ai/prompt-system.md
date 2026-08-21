# Prompt System

## Purpose

Manages prompt templates used across every LLM call in the system:
versioning, per-agent-configuration selection, and — most critically —
the structural separation between instructions and observed content that
underlies NOVA's prompt-injection defense.

## Scope

Template management and the content/instruction separation contract.
Actual call construction using these templates is
`reasoning-engine.md`.

## Template structure

Every prompt template has three structurally distinct sections that are
never concatenated into a single undifferentiated block:

1. **System instructions** — fixed, versioned instructions defining the
   agent instance's role, tool allowlist awareness, and output schema
   requirements (per `planner-agent.md`'s configuration).
2. **Trusted context** — content retrieved from Memory and the Knowledge
   Graph via the Context Builder, treated as background information the
   model should use but is not obligated to "follow" as commands.
3. **Observed content** — any content sourced from Observer data (file
   contents, webpage text, clipboard) or from external tool/MCP results,
   explicitly marked and delimited as data-to-reason-about, never as
   instructions.

This structural separation, not a per-prompt convention, is what the
Reasoning Engine enforces mechanically (`reasoning-engine.md`) — a
template cannot be constructed that merges section 3 into section 1.

## Why this matters specifically for this project

The project's foundational review identified prompt injection via
observed content as a near-unavoidable risk given NOVA's design: agents
read external content and then act with real OS privileges. Structural
separation at the template level is the primary mitigation — it does not
eliminate the risk (a sufficiently adversarial document could still
attempt to influence a summarization's content), but it eliminates the
specific failure mode where observed text is interpreted as a command
that changes what tool gets called next.

## Versioning

Templates are versioned independently of the models they are used with.
A template version change is tracked the same way an ontology version
change is (`docs/04-memory/ontology.md`) — old and new versions do not
silently coexist in a way that makes it unclear which template produced a
given historical output; the audit trail (`docs/10-security/audit.md`,
Tier 3) records the template version used for every call. See
`docs/05-ai/prompt-versioning.md` for the full versioning specification,
including required metadata, version-bump discipline, and rollback.

## Per-agent-configuration selection

`planner-agent.md` configures each agent instance with a system prompt
template selected by task type. The Prompt System is the registry that
resolves "summarization task" or "file-operation task" to the correct,
current template version.

## Related documents

- `docs/25-failure-modes/FM-06-context-prompt-session.md` — failure modes for this subsystem
- `reasoning-engine.md` — where templates are actually assembled into a
  call
- `planner-agent.md` — how agent configuration selects a template
- `docs/10-security/threat-model.md` (Tier 3) — the full injection threat
  model this system defends against
