# Assumptions

## Purpose

States the operating assumptions this architecture is designed around —
conditions taken as given about the environment NOVA runs in, distinct
from requirements (which state what NOVA itself must do). A requirement
failing is a defect; an assumption failing is an expected condition the
system must already be designed to handle gracefully.

## Scope

Environmental and external-system assumptions. Component-specific
assumptions narrower in scope stay in their own documents (e.g., a
specific tool's assumptions about its target application).

## Assumptions about AI models and providers

- **LLMs can fail, time out, or return malformed output.** This is why
  `docs/05-ai/reasoning-engine.md` validates structured output against a
  schema with bounded retry, and why `docs/05-ai/model-router.md`
  supports fallback across providers rather than assuming any single
  provider call always succeeds.
- **Models differ in capability, not just in name or price.** This is
  why `docs/05-ai/model-providers.md`'s capability declaration
  (tool-call support, vision input, context window) is checked before
  routing, rather than assuming any configured model can serve any
  request.
- **Model behavior can change between versions of the same provider's
  model**, even without an explicit NOVA-side update — this is why
  `docs/12-testing/benchmarks.md` and `docs/12-testing/simulation-tests.md`
  run on an ongoing schedule rather than only at NOVA release time, to
  catch drift originating outside NOVA's own code changes.

## Assumptions about tools and external systems

- **Tools may time out or hang.** This is why every tool invocation has a
  configured maximum duration (`docs/03-runtime/failure-recovery.md`'s
  timeout strategy), not an unbounded wait.
- **External APIs change their contracts over time**, independent of
  NOVA's own versioning. This is why `docs/06-tools/api.md` and `docs/06-tools/mcp.md` treat a capability-mismatch or unexpected
  response shape as a normal, handled failure mode, not an exceptional
  crash condition.
- **MCP servers and plugins may be poorly implemented or actively
  malicious**, independent of the user's intent in installing them —
  this is why they are sandboxed and treated as untrusted by default
  (`docs/10-security/sandboxing.md`, `docs/16-extensibility/plugin-sandboxing.md`) rather than trusted based on installation
  choice alone.

## Assumptions about infrastructure

- **The network is unreliable.** Local-first operation
  (`docs/00-overview/non-goals.md`) is partly a direct response to this
  assumption — core functionality (deterministic execution, local memory
  retrieval, local model inference) does not depend on network
  availability.
- **The machine can crash, sleep, or lose power at any point, including
  mid-action.** This is why crash recovery
  (`docs/02-architecture/lifecycle.md`), checkpointing
  (`docs/03-runtime/failure-recovery.md`), and the `Unverified` state
  (`docs/01-product/success-metrics.md`) all exist — none of them are
  optional hardening added after the fact.
- **Storage can become corrupted.** This is why backup and disaster
  recovery (`docs/13-devops/backup.md`, `recovery.md`) exist as
  first-class operational concerns, not an afterthought.

## Assumptions about the user

- **Users give incomplete or conflicting information over time**,
  including changing their mind. This is why memory conflict resolution
  (`docs/04-memory/memory-conflict-resolution.md`) treats contradiction
  as an expected, handled case rather than an error state.
- **Users will not always read or understand every confirmation
  prompt.** This is why destructive-tier confirmation is designed to be
  hard to bypass accidentally (`docs/10-security/permissions.md`) rather
  than relying on the assumption that a careful user will always
  understand what they are approving.
- **Users may operate the machine (switch windows, move the mouse) while
  NOVA is mid-action.** This is why pre-action state re-validation exists
  in `docs/06-tools/automation.md` rather than assuming the world is
  static once a plan is made.

## How assumptions differ from requirements

A requirement (e.g., "verification must never assume success," per
`docs/00-overview/system-invariants.md`) is something NOVA's own code
must guarantee — violating it is a defect in NOVA. An assumption (e.g.,
"the network is unreliable") is a fact about the environment NOVA does
not control — the correct response is design resilience against it, not
an attempt to make the assumption stop being true.

## Related documents

- `docs/00-overview/system-invariants.md` — what NOVA itself must
  guarantee, as distinct from these external conditions
- `docs/03-runtime/failure-recovery.md` — the mechanisms most directly
  responding to the tool/timeout/network assumptions above
- `docs/04-memory/memory-conflict-resolution.md` — the mechanism
  responding to the user-contradiction assumption
