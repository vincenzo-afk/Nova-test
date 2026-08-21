# Planning Tests

Tests that the deterministic-first check correctly routes deterministic-eligible tasks away from the LLM; a passing 'reasoning test' with a failing 'planning test' means the system got the right answer for the wrong (too expensive/less reliable) reason.

## Related documents

- `docs/25-failure-modes/FM-02-planner-task-queue-scheduler.md` — failure modes this evaluation suite targets
