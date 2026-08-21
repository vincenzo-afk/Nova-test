# Common Pitfalls When AI Agents Implement NOVA


## Purpose

Patterns observed to recur specifically when an AI coding agent
implements a system shaped like NOVA — long-running, multi-device,
memory-heavy, LLM-integrated. This is a companion to
`45-code-perfection-failure-modes/`, focused on *agent* behavior rather
than *runtime* failure.

## Pitfalls

1. **Treating the Planner/Executor split as optional and inlining
   execution logic into the Planner.** This collapses the deterministic
   fallback path and the ability to verify a step independently — always
   keep the boundary from `planner-executor-contract.md` intact even in a
   "quick" implementation.
2. **Implementing a new tool by copy-pasting an existing tool and
   forgetting to change its permission scope**, silently granting the new
   tool broader access than intended.
3. **Assuming the memory layer is a simple key-value store** and skipping
   versioning/lineage because "we'll add that later" — later never comes,
   and every consumer built against the simplified interface has to be
   redone.
4. **Writing LLM prompt templates inline in application code** instead of
   through `docs/05-ai/prompt-system.md`'s versioned prompt store, which makes
   prompt changes unreviewable and untestable.
5. **Hardcoding a single provider's response shape** instead of the
   provider-agnostic contract in `docs/18-providers/provider-interface.md`,
   which then breaks the moment routing picks a different provider.
6. **Skipping the sandboxing layer "just for this one trusted plugin"** —
   there is no trusted plugin at the architecture level; trust is a
   permission grant, not a code path exception.
7. **Generating tests that assert on implementation details** (mock call
   counts, internal function names) instead of on the documented
   behavior/contract, making the tests brittle to refactors and useless
   for catching real regressions.
8. **Under-specifying concurrency in generated code and then "fixing" a
   race condition by adding a sleep/delay** instead of an explicit lock,
   queue, or version check — this is a recurring anti-pattern that looks
   like it works in testing and fails intermittently in production.
9. **Forgetting that NOVA is offline-first** — writing code that assumes
   network/provider availability without a documented degraded-mode path
   per `docs/05-ai/deterministic-first.md` and the relevant failure-mode doc.
10. **Treating documentation updates as a follow-up task** rather than
    part of the same change — the two drift, and the next agent to read
    the doc implements against a stale contract.
