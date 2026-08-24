# Plugin / Extension Architecture

## Purpose

Defines NOVA's extension system: how third-party capability is added to
a running instance beyond the SDK-registered plugin tools already
described in `docs/08-api/sdk.md`. Without this, every future capability
addition requires modifying core NOVA code directly, which does not
scale as the tool and integration surface grows — this document exists
specifically to close that gap.

## Scope

The extension system as a whole: what a plugin is, its packaging, and how
it relates to the tool registration already described elsewhere. Detailed
sub-topics (lifecycle, permissions, versioning, dependencies,
marketplace, sandboxing) each have their own document in this folder.

## Relationship to existing tool registration

`docs/08-api/sdk.md` already describes registering an individual tool at
runtime via the SDK. A **plugin** is a broader unit than a single tool: a
packaged bundle that can register multiple tools, declare its own
configuration schema, and carry its own lifecycle (install, enable,
update, disable, uninstall) independent of any single task. Every tool a
plugin registers is still subject to the exact same
`docs/06-tools/tool-interface.md` contract and Permission Manager gating
as any other tool — a plugin is a distribution and lifecycle mechanism,
not a trust escalation mechanism.

## Plugin package structure

```json
{
  "plugin_id": "string, unique, reverse-domain style",
  "version": "semver string",
  "nova_api_version_range": "semver range this plugin was built against and is compatible with (e.g. '>=5.2.0 <6.0.0') — checked at load time; a plugin whose range doesn't include the running NOVA version fails to load with a clear compatibility-mismatch message, per docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md's FM-15-006",
  "display_name": "string",
  "description": "string",
  "provided_tools": ["array of tool_id values this plugin registers"],
  "required_permissions": ["array, per docs/10-security/authorization.md scopes"],
  "optional_permissions": ["array, per docs/10-security/authorization.md scopes; capability may degrade without these"],
  "dependencies": [{ "plugin_id": "string", "version_range": "semver range" }],
  "entry_point": "string, path to the plugin's executable/module"
}
```

## Core architectural principle

A plugin is treated as **untrusted by default**, exactly like an MCP
server (`docs/06-tools/mcp.md`) — it runs as an external process
(`plugin-sandboxing.md`), its tools are registered through the same
validated `tool-interface.md` schema, and it receives no elevated trust
merely for being installed. This is a direct extension of ADR-0006's
security model rather than a new trust boundary.

## Document index

| Document | Covers |
|---|---|
| `plugin-lifecycle.md` | Install, enable, update, disable, uninstall states |
| `plugin-permissions.md` | Permission scoping for plugin-provided tools |
| `plugin-versioning.md` | Semver policy and compatibility |
| `plugin-dependencies.md` | Inter-plugin dependency resolution |
| `plugin-marketplace.md` | Discovery and distribution |
| `plugin-sandboxing.md` | Process isolation for plugin code |

## Developer validation harness

Before a plugin is published to any index source (`plugin-marketplace.md`)
or side-loaded for personal use, its developer runs it against a local
**Plugin Test Harness** distributed as part of the public SDK
(`docs/08-api/sdk.md`): a standalone runner that instantiates the plugin
package outside a live NOVA instance and checks it against the same
contract a real installation would enforce — `docs/06-tools/tool-interface.md` conformance for every declared tool, manifest schema
validity, declared-versus-actual `required_permissions`, and the
`sdk_version_range` compatibility declaration (`plugin-versioning.md`).
The harness reports contract violations before publication rather than a
user's own instance discovering them at install or first-use time. Running
the harness is not itself a trust or signing mechanism — a plugin that
passes it still goes through the unchanged signing (`plugin-marketplace.md`)
and permission-review (`plugin-permissions.md`) steps on the installing
user's machine; the harness only shortens the developer's own iteration
loop, and this project does not warrant that a harness pass guarantees
runtime correctness.

## Related documents

- `docs/25-failure-modes/FM-19-plugin-ecosystem.md` — failure modes for this subsystem
- `docs/08-api/sdk.md` — the tool-registration mechanism plugins use
- `docs/06-tools/tool-interface.md` — the contract every plugin-provided
  tool must satisfy
- `docs/15-decisions/adr-0007-extensibility.md` — the ADR ratifying this
  system
