# Architecture Rules (Non-Negotiables)

## Status: full detail — summary lives in the governance folder

`docs/00-implementation-governance/architecture-lock.md` is the short,
first-read summary of this document and is what the governance folder
points to first. This file remains the authoritative, detailed version
of the non-negotiable rules also summarized in `CONTRIBUTING.md` — the
specific architectural constraints every contribution must satisfy
regardless of how reasonable an exception might seem in a specific case.
If this file and `architecture-lock.md` disagree, this file is correct;
fix the summary, per
`docs/00-implementation-governance/documentation-precedence.md`.

## Purpose

## Scope

Hard constraints derived directly from the five design principles in
`docs/00-overview/design-principles.md` and the ADRs in `docs/15-decisions/`.

## Rule 1: Deterministic Before Intelligent is checked first, always

No code path may invoke an LLM call before the deterministic-first check
(`docs/05-ai/deterministic-first.md`) has run for that task or step. This
is checked in code review by tracing the call path from Planner to
Reasoning Engine — any path that skips the check is rejected regardless
of how narrow or well-intentioned the shortcut appears.

## Rule 2: No execution bypasses the Permission Manager

Every path from Planner/Executor to an actual OS-level action must pass
through the Permission Manager gate (`docs/03-runtime/permission-manager.md`), with no exception for "trusted" internal
callers, test code paths left enabled in production, or new execution
tiers added later. A new tool integration that finds a way to invoke the
Executor without this gate is a defect, not a feature.

## Rule 3: The execution-priority chain order is fixed

A new tool integration is never registered in a way that causes it to be
preferred ahead of a higher execution tier capable of the same action
(`docs/06-tools/execution-priority.md`). Tier assignment at registration
time is validated against the tool's actual mechanism (an API-based
integration cannot register itself as "Native Runtime" tier, for
example).

## Rule 4: No unattended execution without a verification signal

Per `docs/06-tools/tool-interface.md`, a tool that declares
`verification_signal: "none"` must be structurally restricted to
confirmation-required execution — this restriction cannot be overridden
by tool configuration, user preference, or a "trust this tool" setting.

## Rule 5: The Knowledge Graph ontology is closed at runtime

No code path allows a new node or edge type to be created outside the
reviewed extension process in `docs/04-memory/ontology.md` — an
attempted write of an unrecognized type must fail validation, not
silently succeed by expanding the schema on the fly.

## Rule 6: Destructive actions always require confirmation

Per `docs/10-security/permissions.md`, there is no configuration flag,
environment variable, or "power user mode" that disables mandatory
confirmation for destructive/irreversible actions.

## Enforcement

These rules are checked both by automated tests where mechanically
possible (Rules 3, 4, 5, 6 are testable via `docs/12-testing/unit-tests.md` and `integration-tests.md`) and by mandatory code review
attention for the less mechanically-checkable ones (Rules 1 and 2,
verified by tracing call paths).

## Related documents

- `CONTRIBUTING.md` — the summary version of these rules
- `docs/00-overview/design-principles.md` — the principles these rules
  operationalize
- `docs/15-decisions/` — the ADRs each rule traces back to
