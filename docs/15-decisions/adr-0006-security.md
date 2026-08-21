# ADR-0006: Security Model

## Status
Accepted

## Context

The foundational architectural review identified prompt injection via
observed content, and execution-tier escalation as an implicit guardrail
bypass, as the two highest-severity risks in the original concept, given
that NOVA is designed to read external content (files, web pages,
clipboard) and separately hold real OS-level execution privilege. No
consent model, secrets-handling approach, or audit mechanism was
specified in the original concept.

## Decision

Content observed by NOVA (files, web pages, clipboard, MCP tool results)
is structurally separated from instructions at the Prompt System level —
observed content is always data, never an instruction channel, enforced
mechanically rather than by prompting convention. The Permission Manager
gate applies uniformly across every execution tier, independent of which
tier ultimately performs an action, closing the tier-escalation bypass
risk. Every credential is stored in the OS credential vault, referenced
never inlined. All persistent memory is encrypted at rest uniformly, with
no tier exempted. Every autonomous action is fully auditable via a
`correlation_id`-linked trail. Observation permission is granted per
source, off by default, with no capture occurring before explicit
consent.

## Alternatives Considered

- **Per-prompt-convention injection defense** (trusting prompt authors to
  remember to separate content from instructions each time) — rejected
  as unreliable at scale; the separation is enforced structurally in the
  Prompt System and Reasoning Engine instead.
- **Gating only the final execution tier (Vision/Keyboard-Mouse) rather
  than every tier uniformly** — rejected because it would leave earlier
  tiers (API, MCP, CLI) unprotected against the same risk-tier
  requirements, creating an inconsistent security posture depending on
  which tier happened to handle a given task.
- **Default-on observation with opt-out** — rejected in favor of
  default-off, explicit opt-in per source, given the sensitivity of
  continuous file/screen/clipboard observation.

## Consequences

This decision accepts that the residual risk described in
`docs/10-security/threat-model.md` cannot be reduced to zero — a
sufficiently adversarial document can still influence synthesized
content, and an allow-listed application's GUI-tier confirmation gate is
the only remaining safeguard once execution reaches that tier — but
bounds these risks explicitly rather than leaving them unaddressed. It
requires every new tool and content-consuming component to be built
against these structural separations from the outset, verified via
`docs/14-development/architecture-rules.md`.

## Related Documents

- `docs/10-security/threat-model.md` — the full threat model this ADR
  addresses
- `docs/10-security/permissions.md`, `secrets.md`, `encryption.md`,
  `audit.md` — full implementation detail
