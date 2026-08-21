# Sandboxing

## Purpose

Specifies the process-level isolation between NOVA's services, agent
instances, and external tool integrations, implementing Principle 3
(Modular Runtime Architecture) as a security boundary, not only a
reliability one.

## Scope

Process and privilege isolation. Tool-level permission scoping is
`authorization.md`; this document covers the isolation mechanism those
permissions are enforced within.

## Process-level isolation

Per `docs/02-architecture/system-architecture.md`, each supervised
service runs as its own OS process. This is a security boundary as well
as a reliability one: a compromised or malfunctioning component in one
process (for example, a vulnerability in an MCP server integration
running within the Executor's tool-invocation context) cannot directly
read another process's memory space — Memory and Knowledge Graph data
held in their own processes is not directly reachable even if the
Executor process were compromised.

## Privilege minimization by process

Not every process runs with identical OS privilege. The UI Layer process,
per `docs/02-architecture/system-architecture.md`, has no direct
filesystem or input-control privilege at all — it communicates only
through the API Gateway. Only the Observer and Executor processes hold
the specific OS capabilities they need (file access within granted
scopes, input injection for the Automation tier), and only for the
specific capability their role requires.

## MCP and plugin sandboxing

External MCP servers and SDK-registered plugin tools
(`docs/06-tools/mcp.md`, `docs/08-api/sdk.md`) execute as external
processes/connections, never loaded in-process with any NOVA service —
this prevents a plugin's own code from directly accessing NOVA's process
memory, restricting it strictly to the tool-invocation interface and the
permission scope granted to the calling agent instance
(`authorization.md`).

## Agent instance isolation

Concurrently running agent instances (`docs/05-ai/planner-agent.md`) share
the Executor process but are isolated logically through the Permission
Manager's per-instance tool allowlist and the Resource Manager's
exclusive-lock model (`docs/03-runtime/resource-manager.md`) — this is a
logical rather than OS-process-level isolation between instances, a
deliberate trade-off since instances are short-lived and numerous enough
that per-instance process isolation would add overhead disproportionate
to the risk, given that tool-level authorization already bounds what any
instance can do regardless.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `docs/02-architecture/system-architecture.md` — the process topology
  this document treats as a security boundary
- `authorization.md` — the permission scoping enforced within these
  boundaries
- `docs/06-tools/mcp.md`, `docs/08-api/sdk.md` — the external integration
  points sandboxed as described above
