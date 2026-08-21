# Autonomous Plugin and MCP Discovery

## Purpose

Specifies the "I need Telegram → NOVA finds the plugin → installs →
uses" flow: NOVA recognizing a missing capability during planning,
searching the plugin/MCP registry, and proposing installation, without
ever bypassing user approval for the install itself.

## Scope

The discovery-and-proposal flow. Installation mechanics are
`automatic-software-installation.md`; MCP-specific lifecycle states are
`docs/18-providers/mcp-server-management.md`; the underlying sandbox is
unchanged (`docs/16-extensibility/plugin-sandboxing.md`).

## Trigger

During planning, if the Planner determines a requested task requires a
capability with zero enabled providers in the Capability Registry
(`docs/18-providers/capability-management.md`) — e.g., "send this to my
Telegram" with no Messaging channel provider configured — it does not
simply fail. It emits a **Capability Gap** event.

## Discovery flow

1. **Search** — the Capability Gap event triggers a search of the
   plugin/MCP registry (the same registry `mcp-server-management.md`'s
   management surface reads) for a provider matching the missing
   capability domain.
2. **Rank** — candidates are ranked by: how well the manifest's declared
   capability matches the gap, maintainer trust signal (e.g., verified
   publisher, download count, security review status — see
   `docs/16-extensibility/plugin-marketplace.md`), and required
   permission scope (lower requested scope ranked favorably).
3. **Propose** — the top candidate (or up to three, if ambiguous) is
   presented to the user inline in the conversation where the gap was
   discovered: "This needs a Telegram connection — I found the Telegram
   plugin, which would need bot-token access. Install it?"
4. **Stop** — if the user declines, or if no candidate is found, the
   Planner reports the task cannot proceed with that capability and
   suggests the manual path (Settings → Plugins) as a fallback. Nothing
   is installed without the explicit "yes" in step 3.

## Hard limits

- Discovery never auto-installs. Every proposal lands in the **Pending
  approval** state (`docs/18-providers/mcp-server-management.md`) and
  requires the same explicit confirmation any manual plugin install
  requires.
- Discovery never searches or proposes sources outside the vetted
  registry (`docs/16-extensibility/plugin-marketplace.md`) — it does not
  fetch and evaluate arbitrary code from the open internet on its own
  initiative.
- A declined proposal is remembered for the session so NOVA does not
  re-propose the identical install on every subsequent request for the
  same capability; the user can always ask again later.

## Related documents

- `docs/25-failure-modes/FM-18-autonomy-policy-approval.md` — failure modes for this subsystem
- `docs/18-providers/capability-management.md` — source of Capability
  Gap events
- `automatic-software-installation.md` — installing non-plugin software
  the same capability gap might require
- `docs/16-extensibility/plugin-marketplace.md` — the registry and trust
  signals used for ranking
- `docs/10-security/permission-escalation.md` — the approval gate
