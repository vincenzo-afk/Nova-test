# ADR-0008: NOVA v5 — Provider-Agnostic, Multi-Device, Multi-Channel Architecture Evolution

## Status
Accepted (Tier 3 — supersedes portions of ADR-0001, ADR-0006, ADR-0007)

## Context

ADR-0001 (`adr-0001-project-scope.md`) and `docs/00-overview/non-goals.md`
deliberately bounded NOVA v1 to a single Windows machine, a single OS user,
deterministic-first execution, and a fixed set of tools, in order to
protect an early build from unbounded scope. That bet paid off: v1
shipped a working deterministic runtime, memory architecture, and plugin
sandbox.

The product direction has since expanded well beyond what those
boundaries anticipated: an always-listening voice interface, a phone
companion, chat-platform assistants (Telegram, Discord, WhatsApp, and any
future platform), email and calendar assistants, phone calls, screen
sharing from a phone, cross-device continuity, remote control over
Tailscale, pluggable local/cloud speech models, autonomous plugin and MCP
server discovery, automatic software installation, personal analytics,
adaptive personalization, multi-agent collaboration, a browser that is a
first-class reasoning surface rather than an observed one, vision across
every surface NOVA touches, an "AI phone" execution target, self-extending
capability, and a proactive background-assistant mode.

Several of these directly contradict standing non-goals: multi-device,
multi-platform, "not AI-first," a fixed non-self-extending capability set,
and single-machine memory. Per the amendment clause in `non-goals.md`,
changing any of these requires a new ADR that explicitly removes the item
from that document. This ADR is that removal, and the design that replaces
it.

## Decision

NOVA evolves from a single-machine deterministic assistant into a
**provider-agnostic, multi-surface AI runtime**. The evolution is
structural, not a fork: the v1 runtime, memory model, permission system,
and sandboxing model are preserved and generalized, not discarded.

### 1. Everything becomes a Capability behind a Provider interface

Every external function NOVA performs — language generation, vision,
speech-to-text, text-to-speech, embeddings, OCR, reranking, messaging
channels, calendar, email, remote control, plugins, MCP servers — is
modeled as a **Capability**. Each Capability is served by one or more
**Providers**, each implementing a common interface for that Capability
type (see `docs/18-providers/provider-interface.md`). NOVA Core never
imports a provider-specific SDK or contains provider-specific branching
logic; it calls the interface and the Capability Registry
(`docs/18-providers/capability-management.md`) resolves which provider
instance to use.

This directly extends the pattern already established for LLM providers
in `docs/05-ai/model-providers.md` and `docs/05-ai/model-router.md` — v5
generalizes that pattern to every capability domain instead of treating
LLM routing as a special case.

### 2. First-time Setup Wizard becomes mandatory surface area

A first-run wizard (`docs/19-setup/setup-wizard.md`) walks the user
through configuring every capability domain before NOVA starts operating:
provider choice (local vs. cloud) per domain, credentials, hardware
detection and local-model fit, plugin and MCP server selection, routing
policy, and permission defaults. All of this remains editable afterward
through the same configuration system
(`docs/19-setup/configuration-system.md`) — setup is not a one-time
irreversible gate.

### 3. Multi-device and multi-surface replace single-machine scope

The non-goal "not multi-device" is repealed. Memory, identity, and
in-flight task state now have a defined synchronization and conflict model
(`docs/20-devices/multi-device-architecture.md`,
`docs/20-devices/cross-device-memory.md`) spanning desktop, an Android
companion app, and a browser extension surface. Cross-device sync is
**encrypted, opt-in per device, and pull-based from a user-controlled
sync endpoint** — this is explicitly not a NOVA-operated multi-tenant
cloud service (that non-goal is preserved; see `non-goals.md` v2).

### 4. Channel and voice assistants become first-class

Chat-platform assistants (Telegram, Discord, WhatsApp, and any platform
reachable through a Channel Adapter), an email assistant, a calendar
assistant, phone calls, and an always-listening voice interface are
specified in `docs/21-channels/` and `docs/22-voice/`. All channels route
through the same Planner/Executor/Permission pipeline as every other
tool — a message arriving over Telegram is not a privileged execution
path relative to a command typed into the desktop chat.

### 5. Capability and plugin discovery becomes autonomous, within the existing sandbox

The non-goal "not a schema-flexible, self-extending" system is narrowed,
not repealed wholesale: the **knowledge graph ontology remains fixed and
versioned** (that restriction stands), but the **capability/plugin
surface** is now permitted to grow at runtime. When NOVA determines it
needs a capability it doesn't have (e.g., "I need Telegram"), it may
search the plugin/MCP registry, propose an installation, and — subject to
the same permission-escalation gates in `docs/10-security/permissions.md` and `permission-escalation.md` — install and register it. This is
specified in `docs/23-autonomy/autonomous-plugin-discovery.md` and `docs/23-autonomy/automatic-software-installation.md`. No install ever
bypasses user confirmation; autonomy applies to *discovery and proposal*,
not to unattended irreversible action.

### 6. "Not AI-first" is narrowed to "deterministic-first, not deterministic-only"

Deterministic execution remains the default per
`docs/05-ai/deterministic-first.md`. What changes is that always-on
surfaces (voice, background assistant) necessarily involve continuous
model-mediated interpretation of ambiguous input — that is inherent to
the feature, not a violation of the principle. The principle is
restated: **NOVA prefers deterministic execution whenever a deterministic
path exists for the task**; it does not forbid AI-mediated interfaces for
tasks that are inherently language- or perception-shaped.

### 7. Personalization gains adaptive behavior, bounded by the existing privacy model

"Not fine-tuned on user data" is preserved — no component trains or
adjusts model weights. What is added is adaptive *retrieval and policy*
behavior: routing preferences, tone, proactive-assistant timing, and tool
defaults that are learned from explicit and implicit feedback stored as
structured memory (`docs/23-autonomy/personal-analytics.md`,
`docs/23-autonomy/adaptive-personalization.md`) — the same
memory/knowledge-graph substrate as v1, not a new model-weight artifact.

### 8. Multi-agent collaboration is added as an execution mode

The Planner may now decompose a task across multiple concurrently running
agent instances (e.g., a research agent and a code agent working in
parallel), coordinated through the existing event bus and Task Manager,
specified in `docs/24-collaboration/multi-agent-collaboration.md`. This extends `docs/03-runtime/planner.md` and `docs/03-runtime/task-manager.md`
rather than introducing a second runtime.

## What is explicitly *not* repealed

- **Not a hosted multi-tenant cloud service.** Sync and remote control are
  user-endpoint-to-user-endpoint (Tailscale or user-supplied sync target);
  NOVA the project does not operate or store user data on shared
  infrastructure.
- **Not an unsandboxed code executor.** Automatic software installation
  and autonomous plugin installation both execute inside the sandboxing
  model in `docs/10-security/sandboxing.md` and `docs/16-extensibility/plugin-sandboxing.md`.
- **Not a bypass of human approval.** Every destructive, irreversible, or
  credential-granting action — including plugin installs, remote-control
  sessions, and financial actions — still requires explicit confirmation.
  Autonomy is scoped to discovery, proposal, and reversible setup steps.
- **Not fine-tuned on user data.** Personalization stays retrieval-based.
- **Fixed knowledge-graph ontology.** Still versioned and fixed; only the
  capability/plugin surface gained runtime extensibility.

## Consequences

- `docs/00-overview/non-goals.md`, `docs/01-product/project-scope.md`,
  `docs/00-overview/goals.md`, `docs/01-product/feature-list.md`, and
  `ROADMAP.md` are updated in this same change to reflect the repealed and
  narrowed items above.
- `docs/02-architecture/system-architecture.md` gains the Capability
  Registry, Provider layer, Setup Wizard, Channel Adapters, and Multi-Agent
  Coordinator as first-class runtime components.
- Every new provider-backed capability must implement the interfaces in
  `docs/18-providers/provider-interface.md` — no exceptions carved out
  for "just this one integration."
- This ADR does not change the Tier system in
  `docs/00-overview/normative-precedence.md`; conflicts between this ADR
  and a lower-tier document resolve in favor of this ADR until a future
  ADR supersedes it.

## Related documents

- `adr-0001-project-scope.md` — the scope this ADR partially supersedes
- `docs/00-overview/non-goals.md` — updated exclusion list (v2)
- `docs/18-providers/` — the provider/capability abstraction layer
- `docs/19-setup/` — the setup wizard and configuration system
- `docs/20-devices/`, `docs/21-channels/`, `docs/22-voice/`,
  `docs/23-autonomy/`, `docs/24-collaboration/` — the new capability
  domains this ADR authorizes
