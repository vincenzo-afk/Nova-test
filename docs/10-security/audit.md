# Audit Trail

## Purpose

Specifies the complete, searchable record of every autonomous action
NOVA takes — the mechanism behind "why did you do that" explainability
identified as a required feature, not an optional enhancement, during
this project's foundational review.

## Scope

What is recorded, how it is structured, and how it is queried. Retention
of the underlying memory this audit trail references is
`docs/04-memory/memory-lifecycle.md`.

## What is recorded per action

Every Permission Manager decision, every Executor invocation, and every
Verifier outcome is logged with: the task's `correlation_id`
(`docs/02-architecture/communication-model.md`), which agent instance
performed it (`docs/05-ai/planner-agent.md`), which memory/graph records
informed the plan (from Context Builder, `docs/05-ai/context-builder.md`),
which tool and execution tier was used (`docs/06-tools/tool-registry.md`),
the structured result and verification outcome
(`docs/06-tools/tool-interface.md`, `docs/03-runtime/verifier.md`), and a
timestamp.

## Reconstructing a full causal chain

Because every message on the Communication Bus carries the same
`correlation_id` for a given task (`docs/02-architecture/communication-model.md`), the audit trail can reconstruct the complete
path from a user's original request through every plan step, tool
invocation, and verification result it produced — this is what makes "why
did you do that" answerable directly from the log, without needing to
interview the system or guess at its reasoning after the fact.

## Availability window

Full step-level audit detail remains queryable for the duration Recent
Memory retains the underlying records (`docs/04-memory/memory-lifecycle.md`), even after those records have been summarized into Long-term
Memory for ordinary retrieval purposes — summarization compresses what
Search and Context Builder use for everyday queries, but does not delete
the underlying step-level audit detail until it separately ages into
Archive and, eventually, is deleted per the user's retention choices
(`docs/04-memory/timeline.md`).

## What is deliberately excluded from the audit trail

Credential values are never recorded, even though credential _use_ is
(`secrets.md`). Raw keystroke or mouse-movement content is never recorded
since it is never captured in the first place
(`docs/07-observers/keyboard.md`, `docs/07-observers/mouse.md`). Raw screen
frames are also never recorded: desktop-agent audit entries retain only the
permission decision, task/correlation identifiers, tool/action metadata,
focus-check result, bounded structured evidence, and verification outcome;
they never include PNG bytes or base64 payloads (`docs/06-tools/desktop-agent.md`).

## Access to the audit trail

Surfaced through the Memory Explorer's per-record detail view
(`docs/09-ui/memory-explorer.md`) and through a dedicated audit query
endpoint on the external API (`docs/08-api/rest-api.md`) for programmatic
inspection, both subject to the same authorization scoping as any other
memory access (`authorization.md`).

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `docs/02-architecture/communication-model.md` — the `correlation_id`
  mechanism this trail depends on
- `docs/09-ui/memory-explorer.md` — the primary user-facing access point
- `secrets.md` — the exclusion of credential values from this trail
