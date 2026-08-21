# Crash Recovery

On restart after an unclean shutdown, NOVA runs an integrity check pass before resuming normal operation, surfacing a recovery banner (per `docs/31-user-flows/recovery-flow.md`) rather than silently proceeding on possibly-inconsistent state.
