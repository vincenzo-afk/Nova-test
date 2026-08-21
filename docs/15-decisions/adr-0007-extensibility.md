# ADR-0007: Extensibility and Capability System

## Status
Accepted

## Context

The initial architecture treated every tool and capability as part of
core NOVA, registered directly against the Tool Registry
(`docs/06-tools/tool-registry.md`) with no distinction between a single
tool and a distributable, independently-lifecycled bundle of
capability, and no abstraction letting the Planner reason about "what
NOVA can do" without hardcoding assumptions about specific registered
tools. A follow-up review identified this as a critical gap for future
expansion: adding new capability would either require modifying core code
directly or accumulate an unbounded, undifferentiated set of tools with
no independent versioning, permission review, or lifecycle management.

## Decision

Two new layers are added above the existing Tool Registry:

1. A **Plugin/Extension system** (`docs/16-extensibility/`) providing
   packaged, independently-lifecycled (install/enable/update/disable/
   uninstall) distribution of tool bundles, each treated as untrusted by
   default and sandboxed as an external process, with explicit
   permission review at install and on any permission-expanding update.
2. A **Capability Registry** (`docs/05-ai/capability-registry.md`)
   providing a named, higher-level abstraction above individual tools —
   the Planner selects a capability, and Tool Selection resolves it to a
   concrete, currently-registered tool, so that adding, removing, or
   replacing a tool never requires a Planner code change.

## Alternatives Considered

- **Treating every new tool as a direct core-code addition** — rejected
  as unsustainable; it directly contradicts the modular, plugin-friendly
  extensibility the project needs to remain viable as capability grows.
- **A capability abstraction with no separate plugin packaging layer**
  (i.e., only adding the Capability Registry) — rejected because it
  would not solve the independent lifecycle, versioning, and
  distribution problem; a capability abstraction alone does not answer
  "how does a third party ship and update a bundle of tools safely."
- **Granting installed plugins elevated trust by default** (assuming a
  user who chose to install something trusts it fully) — rejected in
  favor of treating plugins identically to MCP servers under the existing
  threat model (`docs/10-security/threat-model.md`), since installation
  intent does not change the actual risk profile of running third-party
  code with tool-invocation access.

## Consequences

This decision makes it possible to add new capability without modifying
Planner logic or core tool-registration code, and makes third-party
capability distribution possible without expanding NOVA's trust
boundary. It requires every new tool-bearing feature going forward to be
evaluated against two additional questions — does this belong in a
plugin rather than core, and what capability_id does this register
under — adding a small amount of design overhead to future additions in
exchange for long-term extensibility.

## Related Documents

- `docs/16-extensibility/plugin-architecture.md` and its accompanying
  documents — full plugin system specification
- `docs/05-ai/capability-registry.md` — full capability abstraction
  specification
- `docs/10-security/threat-model.md` — the existing trust model this
  decision extends rather than replaces
