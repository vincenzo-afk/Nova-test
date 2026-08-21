# ADR-0005: Tool System

## Status
Accepted

## Context

The original concept described seven execution modes ranked by
preference (direct API/tool call down to vision-based control) but
without a firm rule preventing a lower, riskier tier from being used
merely because it was convenient, and without specifying how "the task
actually succeeded" would be confirmed. The foundational review
identified two specific risks: verification that assumes success rather
than confirming it, and GUI/vision automation functioning as an implicit
bypass of an application's own safety checks if not tightly bounded.

## Decision

A fixed, eight-tier execution priority chain is adopted: Native Runtime →
Internal Functions → API → MCP → CLI → Accessibility APIs → Vision →
Keyboard/Mouse. A lower tier is used only when every higher tier is
confirmed unavailable for the specific action; this ordering cannot be
overridden per-tool. Every tool must declare a verification signal;
tools that cannot are restricted to confirmation-required execution only,
with no override. Verification is ground-truth-first — vision-based
checks are a secondary fallback, never the primary or sole signal, and
"Unverified" is a first-class, non-success terminal outcome. Vision and
Keyboard/Mouse tiers are restricted to an explicit, maintained
application allow-list rather than available generally.

## Alternatives Considered

- **Allowing per-tool configurable tier preference** — rejected because
  it would let a convenience-motivated integration bypass the safety
  ordering the fixed chain exists to enforce.
- **Treating vision-based verification as sufficient on its own** —
  rejected because it shares the same probabilistic failure modes as
  vision-based action, providing no independent check.
- **General-purpose vision/keyboard-mouse automation for any
  application** — rejected as a direct implementation of the project's
  "not a general-purpose RPA platform" non-goal; scope is limited to an
  explicit allow-list to bound both risk and ongoing maintenance burden.

## Consequences

This decision makes the system's riskiest capability the most tightly
bounded and the most heavily gated, at the cost of not supporting
arbitrary third-party applications without deliberate, incremental
allow-list additions. It requires every new tool integration to do the
extra work of providing a real verification signal rather than a bare
success flag, which is enforced structurally via
`docs/06-tools/tool-interface.md` rather than left as guidance.

## Related Documents

- `docs/06-tools/execution-priority.md`, `docs/06-tools/tool-interface.md`,
  `docs/06-tools/vision.md`, `docs/06-tools/automation.md` — full implementation detail
- `docs/03-runtime/verifier.md` — the verification hierarchy this ADR
  establishes
