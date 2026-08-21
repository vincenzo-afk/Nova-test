# Prompt Versioning

## Purpose

Provides the full versioning specification for every system, agent, and
planner prompt template, extending the brief mention in
`docs/05-ai/prompt-system.md` into a complete policy: every prompt
template carries a version, creation date, last-updated date, and
changelog.

## Scope

Prompt template versioning specifically. General template structure
(system instructions / trusted context / observed content separation) is
`docs/05-ai/prompt-system.md`.

## Prompt template metadata

Every registered template (per `docs/05-ai/prompt-system.md`'s registry)
carries:

```json
{
  "template_id": "string",
  "version": "semver string",
  "created": "ISO 8601",
  "updated": "ISO 8601",
  "changelog": [
    { "version": "semver string", "date": "ISO 8601", "summary": "string" }
  ],
  "used_by": ["array of agent-instance configuration types, per docs/05-ai/planner-agent.md"]
}
```

## Why prompts specifically need this discipline

Unlike most code, a prompt template change can alter model behavior in
ways that are not caught by conventional type-checking — a seemingly
minor wording change can measurably shift output quality or safety
properties (e.g., how reliably the content/instruction separation in
`docs/05-ai/prompt-system.md` is respected by the model). Explicit
versioning and a changelog make it possible to correlate a behavior
change (caught by `docs/12-testing/simulation-tests.md`'s golden
datasets or benchmark regression tracking) back to the specific prompt
change that caused it.

## Version bump discipline

- **Patch** — wording clarification with no intended behavior change.
- **Minor** — additive instruction (e.g., handling a new edge case)
  expected to be backward compatible with existing behavior.
- **Major** — a change expected to measurably alter output behavior,
  requiring a full simulation-test pass
  (`docs/12-testing/simulation-tests.md`) before release, not merely unit
  testing.

## Audit trail integration

Per `docs/10-security/audit.md`, every logged action already records
which agent instance and, transitively, which prompt configuration
produced a given plan step. This document's `template_id` and `version`
fields are what make that traceable to a *specific* prompt version, not
just "the Planner" generically — supporting the "why did you do that"
explainability requirement down to the exact prompt text in effect at
the time.

## Rollback

A prompt template version found to cause a regression can be rolled back
independently of a full software version rollback (`docs/13-devops/updates.md`) — since prompt templates are versioned and changelogged
separately from code releases, reverting `template_id` to its prior `version` does not require reverting any other component.

## Related documents

- `docs/25-failure-modes/FM-06-context-prompt-session.md` — failure modes for this subsystem
- `docs/05-ai/prompt-system.md` — the template structure this versioning
  applies to
- `docs/12-testing/simulation-tests.md` — required testing for major
  version changes
- `docs/10-security/audit.md` — how prompt version is captured in the
  audit trail
