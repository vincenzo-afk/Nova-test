# Threat Model

## Purpose

The consolidated threat model for NOVA, drawn directly from the risks
identified during this project's foundational architectural review. This
document states each threat explicitly, the specific mechanism that
mitigates it, and — honestly — what residual risk remains after
mitigation, rather than presenting any mitigation as a complete solution.

## Scope

The threats specific to NOVA's architecture: a system with real OS
privilege, continuous observation, and autonomous execution capability.
General software security practices (input validation, dependency
hygiene) are assumed and not re-derived here.

## Threat 1: Prompt injection via observed content

**Threat:** NOVA observes browser pages, files, and clipboard content,
then reasons and acts using an LLM. Adversarial content embedded in
observed material (a webpage or document containing text designed to be
interpreted as an instruction) could attempt to hijack an agent instance
into taking unintended actions.

**Mitigation:** Structural content/instruction separation enforced at
the Prompt System level (`docs/05-ai/prompt-system.md`) — observed
content is always presented to the model as data, never concatenated
into the instruction channel. This is enforced mechanically by the
Reasoning Engine's call construction (`docs/05-ai/reasoning-engine.md`),
not left to per-prompt convention.

**Residual risk:** This mitigation prevents observed content from being
interpreted as a direct command that changes tool selection. It does not
guarantee that a sufficiently adversarial document cannot influence the
*content* of a summarization or synthesized answer about that document —
grounding requirements (`docs/04-memory/search.md`) reduce but do not
eliminate this residual risk for synthesis-type tasks.

## Threat 2: Execution-tier escalation as a guardrail bypass

**Threat:** Falling back from a safer execution tier (API, MCP) to a
less safe one (Vision, Keyboard/Mouse) when the safer tier is unavailable
could, if not carefully bounded, function as a way to route around the
target application's own permission checks.

**Mitigation:** The Permission Manager gate
(`docs/03-runtime/permission-manager.md`) applies uniformly and
independently of execution tier — escalating tiers changes *how* an
action is performed, never *whether* NOVA's own risk-tier confirmation
requirements apply. Additionally, Vision and Keyboard/Mouse tiers are
restricted to an explicit application allow-list
(`docs/06-tools/vision.md`), not available generally.

**Residual risk:** For applications on the allow-list, NOVA's own
confirmation gate is the only remaining safeguard once execution reaches
these tiers — the target application's own authorization model is
genuinely bypassed at that point, by design, since there is no other way
to operate an application with no API. This is why the allow-list is kept
deliberately short and why destructive actions at these tiers require
mandatory multi-step confirmation with no override
(`docs/06-tools/automation.md`).

## Threat 3: Compromised or malicious MCP server / plugin

**Threat:** A third-party MCP server or SDK-registered plugin could
attempt to exceed its intended access, exfiltrate data, or return
adversarial content.

**Mitigation:** Process-level sandboxing (`sandboxing.md`), per-agent-
instance tool allowlists enforced independently of what the external
component itself claims (`authorization.md`), and treatment of all
returned content as observed data subject to Threat 1's mitigation
(`docs/06-tools/mcp.md`).

**Residual risk:** A malicious MCP server can still decline to perform
the action it claims to, return misleading (but not injection-capable)
data within its granted scope, or attempt denial-of-service against
NOVA's own resources — the mitigations here bound *escalation*, not
every possible form of a misbehaving but properly-scoped external
component.

## Threat 4: False-positive verification

**Threat:** A vision-based or otherwise weak verification signal could
confirm an action as successful when it was not, creating incorrect
user trust.

**Mitigation:** Ground-truth-first verification
(`docs/03-runtime/verifier.md`) with vision used only as a secondary
fallback, and "Unverified" as a first-class non-success outcome
(`docs/01-product/success-metrics.md`) rather than assuming success in
ambiguous cases.

**Residual risk:** For actions with genuinely no ground-truth signal
available and where vision is also inconclusive, the honest outcome is
"Unverified," which still requires the user or Planner to decide how to
proceed — this mitigation prevents false confidence, but does not
manufacture certainty where none exists.

## Threat 5: Shared-machine data leakage

**Threat:** On a machine with multiple OS user accounts, one user's NOVA
workspace could potentially become readable by another.

**Mitigation:** Per-OS-account workspace isolation
(`docs/00-overview/non-goals.md`, `authentication.md`), with encryption
keys tied to the specific user's OS credentials (`encryption.md`).

**Residual risk:** This mitigation does not protect against a
compromised OS account itself (e.g., an attacker with that specific
user's own credentials) — that is an OS-level security boundary NOVA
inherits rather than independently strengthens.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- Every document in `docs/10-security/` implements at least one
  mitigation referenced above
- `docs/15-decisions/adr-0006-security.md` — the ADR ratifying this
  overall threat model
