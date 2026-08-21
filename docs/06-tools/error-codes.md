# Error Codes

## Purpose

A structured, stable error code reference for every category of failure
NOVA can report externally (via the API, `docs/08-api/schemas.md`) or
internally (via the audit trail, `docs/10-security/audit.md`) — so that
error handling can be built against stable codes rather than parsing
free-text messages, which may change wording without notice.

## Scope

Error code namespace and allocation. The failure taxonomy each code
category maps to is `docs/03-runtime/failure-recovery.md`.

## Code structure

`NOVA-<category_prefix><sequence>` — e.g., `NOVA-CFG001`. The prefix
identifies the subsystem; the sequence is a stable, never-reused number
within that subsystem.

## Allocated ranges

| Prefix | Subsystem | Failure taxonomy category (typical) |
|---|---|---|
| `CFG` | Configuration (`docs/14-development/configuration.md`) | Validation |
| `SEC` | Security / permissions (`docs/10-security/`) | Security |
| `MEM` | Memory / Knowledge Graph (`docs/04-memory/`) | Internal, External |
| `TSK` | Task Manager (`docs/03-runtime/task-manager.md`) | Varies by wrapped step error |
| `TL` | Tools (`docs/06-tools/`) | Varies — see `docs/03-runtime/failure-recovery.md`'s tool retry matrix |
| `MCP` | MCP protocol specifically (`docs/06-tools/mcp.md`) — split from `TL` because MCP failures (server unreachable, protocol version mismatch) are protocol-level, not generic tool-execution failures | External, Transient |
| `AI` | AI layer / Model Router (`docs/05-ai/`) | Transient, External |
| `PLG` | Plugins (`docs/16-extensibility/`) | External, Security |
| `NET` | Network / external API (`docs/06-tools/api.md`, `mcp.md`) | External, Transient |
| `WF` | Workflow (`docs/17-workflow/workflow-engine.md`) | Varies by wrapped node/step error |
| `EVT` | Event Bus (`docs/02-architecture/event-bus-specification.md`) | Internal |
| `SYNC` | Multi-Device (`docs/28-multi-device-protocol/`) | External, Transient |

## Example codes

- **`NOVA-CFG001`** — Invalid configuration value (fails schema
  validation per `docs/14-development/configuration-schema.md`).
- **`NOVA-MEM001`** — Memory storage corruption detected (triggers
  `docs/13-devops/recovery.md`).
- **`NOVA-MEM002`** — Knowledge Graph cycle detected on write (violates
  `docs/00-overview/system-invariants.md`'s acyclic-graph invariant;
  write rejected).
- **`NOVA-SEC001`** — Destructive action attempted without confirmation
  (should never occur if `docs/03-runtime/permission-manager.md` is
  correctly enforced; treated as Critical per
  `docs/13-devops/incident-response.md`).
- **`NOVA-SEC002`** — Plugin signature verification failed
  (`docs/10-security/supply-chain-security.md`).
- **`NOVA-TL001`** — Tool invocation timed out
  (`docs/03-runtime/failure-recovery.md`'s timeout strategy).
- **`NOVA-TL002`** — Tool returned a result violating its declared
  `output_schema` (`docs/06-tools/tool-interface.md`).
- **`NOVA-AI001`** — All configured providers exhausted for a call
  (`docs/05-ai/model-router.md`'s failure/fallback).
- **`NOVA-PLG001`** — Plugin dependency unresolved at enable time
  (`docs/16-extensibility/plugin-dependencies.md`).
- **`NOVA-NET001`** — External API contract mismatch (unexpected response
  shape), per `docs/00-overview/assumptions.md`'s "external APIs change"
  assumption.

## Allocation policy

A new error code is allocated, not reused, for a genuinely new failure
condition — an existing code's meaning is never redefined, since external
consumers (`docs/08-api/`) may have already built handling against it.
Deprecating a code (the underlying condition no longer being possible)
retains the code as reserved/unused rather than reassigning its number.

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `docs/03-runtime/failure-recovery.md` — the taxonomy these codes map to
- `docs/08-api/schemas.md` — where error codes appear in API responses
- `docs/00-overview/system-invariants.md` — the invariant several
  example codes above protect
