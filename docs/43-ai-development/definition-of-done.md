# Definition of Done


## Purpose

The single bar every NOVA task must clear, referenced by ticket templates
rather than restated per-ticket.

## Checklist

- [ ] All acceptance criteria in `acceptance-criteria.md` format are
      written and pass.
- [ ] Every failure mode listed in the task's linked
      `25-failure-modes/` / `45-code-perfection-failure-modes/` entries
      is handled with an explicit, typed path — not a generic catch.
- [ ] No function added calls an LLM provider directly, bypassing
      `docs/05-ai/model-router.md` (unless the task *is* the Model Router).
- [ ] No function added writes to a memory tier bypassing
      `docs/04-memory/memory-storage.md`'s write path.
- [ ] Every new tool/action is registered with the permission model
      before being reachable by the Planner/Executor.
- [ ] Every new cross-device or cross-process message is schema-versioned
      per `docs/08-api/schemas.md` and `28-multi-device-protocol/`.
- [ ] Every new error case is added to
      `docs/26-system-reference/06-error-catalog.md` rather than left as an
      ad-hoc string.
- [ ] Every new state machine or status field is added to
      `docs/26-system-reference/04-state-transition-tables.md`.
- [ ] Tests exist per `docs/12-testing/testing-strategy.md` for the layer(s)
      touched (unit at minimum; integration if a service boundary is
      crossed; chaos test if a failure-recovery path is added).
- [ ] Docs updated in the same change if the implementation diverged from
      the spec — the spec is not allowed to silently go stale.
- [ ] Reviewed against `review-checklist.md`.

A task that fails any box is not done — it is in progress, regardless of
whether the happy path runs.
