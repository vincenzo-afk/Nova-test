# CLI (Execution Tier 5)

## Purpose

Describes command-line invocation as an execution tier: which commands
are permitted, how they are sandboxed, and how output is captured into
the structured result contract every tool must provide.

## Scope

CLI-specific execution mechanics. General tier-ordering rules are
`execution-priority.md`.

## Command allow-list

CLI execution is restricted to an explicit, registered set of command
templates (e.g., a specific set of `git` subcommands, not an arbitrary
shell string) — NOVA does not execute freeform shell input constructed
from natural language, since that would collapse the risk-tiering and
verification-signal declarations required by `tool-interface.md` into a
single opaque action. Each registered command template declares its own
risk tier and expected exit-code/output contract at registration time,
exactly like any other tool.

## Parameter binding

When the Planner selects a CLI tool for a step, parameters (e.g., a
specific file path for a `git add` template) are bound into the
command template through explicit, typed parameter slots — never through
raw string concatenation of model output into a shell command — which is
what prevents a maliciously crafted filename or ambiguous natural-language
parameter from being interpreted as an additional shell command or flag.

## Sandboxing

CLI commands execute with the same OS-user privileges as NOVA itself
(per `docs/01-product/project-scope.md`'s single-user model) but within a
working-directory scope constrained to the task's relevant project or
folder wherever the command template supports it, reducing the blast
radius of an incorrectly parameterized command.

## Output capture and verification signal

Exit code is always captured and is the primary verification signal for
CLI tools (`docs/03-runtime/verifier.md`). Stdout/stderr are captured and
returned as part of the structured result's evidence where relevant
(e.g., `git status` output is itself the useful result, not just its
exit code) — but exit code remains the authoritative success/failure
signal even when output text is also informative.

## Timeout handling

Every CLI invocation has a configured maximum execution time; a command
exceeding it is terminated and reported as a failure with a timeout
reason, rather than allowed to run indefinitely and block the Scheduler's
concurrency slot (`docs/03-runtime/scheduler.md`).

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `execution-priority.md` — CLI's place in the tier ordering
- `tool-interface.md` — the structured result contract CLI tools
  populate
- `docs/03-runtime/verifier.md` — how exit codes are used as ground truth
