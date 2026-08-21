# Tool Schema Versioning

## Purpose

Specifies how a registered tool's input/output contract
(`docs/06-tools/tool-interface.md`) evolves over time, so that a tool
update does not silently break a Planner or another tool that depends on
its prior contract.

## Scope

Tool-level input/output schema versioning. Plugin-package versioning
(the bundle a tool ships in) is `docs/16-extensibility/plugin-versioning.md`; this document covers the tool contract itself.

## Tool version metadata

Extending `docs/06-tools/tool-interface.md`'s registration schema:

```json
{
  "tool_id": "string",
  "version": "semver string",
  "input_schema_version": "semver string",
  "output_schema_version": "semver string",
  "breaking_changes": [
    { "from_version": "string", "to_version": "string", "description": "string" }
  ],
  "compatible_with": ["array of prior major versions still callable via a compatibility shim, if any"]
}
```

## Compatibility rules

- **Patch** — internal fix, no input/output contract change.
- **Minor** — additive input parameters (with defaults) or additive
  output fields; existing callers unaffected.
- **Major** — a breaking change to required inputs, output structure, or
  the meaning of an existing field. Registered as a `breaking_changes`
  entry with an explicit description.

## Handling a breaking change

When a tool's major version changes, the Tool Registry
(`docs/06-tools/tool-registry.md`) retains awareness of the prior
version's contract for any in-flight task that selected it before the
update — an in-flight task is not silently handed a new, incompatible
contract mid-execution. New task planning after the update uses the
current version. Where feasible, a tool can declare `compatible_with` to
support a compatibility shim translating an older caller's input/output
expectations, but this is optional, not assumed.

## Interaction with the Capability Registry

Per `docs/05-ai/capability-registry.md`, a capability's `required_tools`
list may reference a specific tool version range, not just a bare
`tool_id` — this allows a capability to remain stable even as its
underlying tool implementation goes through non-breaking version changes,
and to be flagged for review if the only available tool version is
incompatible with what the capability declares it needs.

## Testing requirement

Per `docs/12-testing/validation.md`, a major version change to any tool
requires integration test coverage confirming the new contract, and, for
tools already covered by simulation testing, a check that recorded replay
scenarios using the prior contract either still function via a
compatibility shim or are explicitly flagged as requiring update.

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `docs/06-tools/tool-interface.md` — the base contract this versioning
  extends
- `docs/05-ai/capability-registry.md` — the capability layer that can
  reference specific tool version ranges
- `docs/16-extensibility/plugin-versioning.md` — the analogous
  package-level versioning for plugins
