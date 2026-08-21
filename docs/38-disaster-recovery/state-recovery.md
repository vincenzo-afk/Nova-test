# State Recovery

Any status field left in a non-terminal state (e.g. task 'in-progress') beyond its documented max duration is swept and resolved to a terminal state (failed/timed-out) by a recovery pass, per `docs/26-system-reference/04-state-transition-tables.md`.
