# Workflow Failures

## Known failure patterns

Cycle in a dynamically generated workflow graph; parallel branch write conflict; stuck human-approval gate (mitigated by the 24-hour approval timeout in `docs/17-workflow/workflow-engine.md`'s Retry and timeout at the workflow level section — listed here as the failure pattern to keep testing against, not as an unresolved gap); partial rollback leaving orphaned resources.

## Cross-reference

See `docs/45-code-perfection-failure-modes/06-workflow-engine.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
