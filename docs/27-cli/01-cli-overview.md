# CLI Overview

## Purpose

NOVA ships a dedicated developer CLI, not just an application launcher.
This is Priority-1 infrastructure: every other document in this folder
details one branch of the tree below. The CLI is the primary interface
contributors (human or AI agent) use to bootstrap, diagnose, extend, and
operate a NOVA installation without hand-editing config files or
guessing at internal state.

## Command tree

```
nova
├── init                 Bootstrap a new NOVA workspace         (02)
├── doctor                Full environment health check          (02)
├── diagnostics            Generate diagnostics.zip               (02)
├── upgrade                Upgrade schemas/configs/plugins/docs   (02)
├── repair                 Auto-fix common broken states          (02)
├── env                    Show detected environment/hardware     (03)
├── config                 View/edit resolved configuration       (03)
├── context                Emit docs relevant to a subsystem      (04)
├── task                   Generate an AI-ready task package      (04)
├── impact                 Show blast radius of a proposed change (04)
├── docs                   Query documentation by topic           (04)
├── graph                  Render the dependency graph            (04)
├── logs                   Tail/query structured logs             (05)
├── traces                 Query distributed traces               (05)
├── metrics                Query metrics                          (05)
├── replay                 Replay a recorded event/task sequence  (05)
├── events                 Tail the live event bus                (05)
├── profile                Profile a running task/workflow        (05)
├── benchmark               Benchmark providers/tools/memory       (05, 07)
├── inspect                 Inspect a task/plan/memory record       (05)
├── explain                 Explain an error ID or trace            (05, 07)
├── plugin                  Plugin SDK subcommands                 (06)
├── agent                   AI SDK: agent subcommands              (06)
├── tool                    AI SDK: tool subcommands               (06)
├── workflow                AI SDK: workflow subcommands            (06)
├── provider                AI SDK: provider subcommands            (06)
├── prompt                  AI SDK: prompt subcommands              (06)
├── sandbox                 Isolated test environment              (07)
├── migrate                 Config/memory/plugin/schema migration  (07)
├── report                  Full system report                     (07)
├── verify                  Repository/signature/schema integrity  (07)
├── clean                   Safe cache/artifact cleanup             (07)
└── dev                     Developer-mode shortcuts (all of the above, unlocked)
```

(Numbers in parentheses point to the file in this folder with full detail.)

## Design principles

1. **Every command is scriptable.** Every command supports `--json`
   output in addition to human-readable output, so CI and AI agents can
   consume results programmatically rather than parsing terminal text.
2. **Every destructive command dry-runs by default where feasible.**
   `nova repair`, `nova clean`, and `nova migrate` all support `--dry-run`
   (and `clean`/`migrate` default to it, requiring an explicit `--apply`),
   consistent with the confirmation discipline in
   `docs/10-security/permissions.md` applied to the CLI surface, not just
   the conversational one.
3. **Every command that touches the network fails closed, not silent.**
   A command requiring network access that can't reach it reports
   `NOVA-NET*` (see `docs/26-system-reference/06-error-catalog.md`)
   explicitly rather than hanging or producing misleadingly-empty output.
4. **The CLI and the conversational agent share one Executor.** `nova`
   subcommands that perform real actions (not just reporting) route
   through the same `docs/03-runtime/executor.md` and Permission Manager
   path as an agent-issued tool call — the CLI is not a privileged
   bypass of NOVA's own safety gates.

## Related documents

- `docs/26-system-reference/01-component-dependency-graph.md` — the
  module structure `nova graph` visualizes - `docs/26-system-reference/06-error-catalog.md` — the codes every
  command's failure output uses
- `docs/25-failure-modes/FM-25-cli-infrastructure.md` — consolidated
  failure index for this whole folder

## Where This Breaks

Failure modes specific to this command group. Cross-referenced from `docs/25-failure-modes/FM-25-cli-infrastructure.md`, which indexes all CLI failure entries in one place.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-25-001** | Command tree in this doc drifts from actual `--help` output | A subcommand is added/removed/renamed in code without updating this file. | Doc-lint (`docs/26-system-reference/11-documentation-lint-ci.md`) diffs `nova --help` (recursively) against this tree. | Medium | Generate this tree from the CLI's own command registry rather than hand-maintaining it. | Regenerate and correct; treat manual drift as the trigger to add the generation step if missing. |
| **FM-25-002** | `--json` output isn't actually consistent across commands | One command's JSON schema changes without a version bump, breaking scripts/agents that consume it. | Contract test snapshot-compares each command's `--json` output shape against a committed schema. | Medium | Version the JSON output schema per command family, same discipline as `docs/02-architecture/communication-model.md` applies to events. | Restore the prior schema or bump the version and update consumers; never silently change shape under the same version. |
| **FM-25-003** | A destructive command ships without dry-run support | New command added under `clean`/`migrate`/`repair` without the dry-run-by-default pattern. | Code review checklist item; static check that any command touching `docs/25-failure-modes/FM-*` 'destructive' patterns exposes `--dry-run`. | High | Make dry-run-by-default a template requirement for any new command under those three groups. | Add `--dry-run` support before the command ships; treat any already-shipped gap as a priority backport. |
