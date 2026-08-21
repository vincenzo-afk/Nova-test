# FM-07: Tool Execution & MCP (Model Context Protocol)

## Purpose

Failures in actually calling out to the world — local tools, binaries, and MCP servers — where the gap between 'the model decided to call a tool' and 'the tool actually did the right thing' opens up.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/06-tools/tool-interface.md` - `docs/06-tools/tool-registry.md` - `docs/06-tools/mcp.md` - `docs/06-tools/error-codes.md` - `docs/06-tools/tool-schema-versioning.md` - `docs/05-ai/tool-selection.md` - `docs/06-tools/tool-system.md` - `docs/06-tools/execution-priority.md` - `docs/06-tools/native-runtime.md` - `docs/06-tools/api.md` - `docs/06-tools/cli.md` - `docs/06-tools/accessibility.md` - `docs/06-tools/automation.md` - `docs/18-providers/mcp-server-management.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-07-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-07-001** | Binary missing | Tool expects a local executable that isn't installed or isn't on PATH. | Process spawn fails with 'not found'. | Medium | Declare tool dependencies explicitly and verify presence at capability-registration time, not first-use time. | Surface a clear installation-required message rather than a raw spawn error; offer auto-install where safe (FM-19). |
| **FM-07-002** | Wrong version | Installed binary version doesn't match what the tool integration expects, causing subtle argument/output incompatibility. | Output format doesn't match the expected schema despite a successful exit code. | Medium | Version-check the binary output (e.g. `--version`) against a known-compatible range at registration time. | Pin the required version explicitly; block use of an incompatible version rather than guessing compatibility. |
| **FM-07-003** | Permission denied | Tool lacks OS-level permission for the requested action (file, network, device). | Non-zero exit code / OS-level permission error. | Medium | Pre-flight permission check via `docs/03-runtime/permission-manager.md` before attempting the action, not just handling the error after the fact. | Prompt for the specific permission needed with a clear explanation of why; retry once granted. |
| **FM-07-004** | Wrong arguments | Model constructs a tool call with parameters that don't match the tool's actual schema (type, required-field, or semantic mismatch). | Schema validation fails before the tool is even invoked. | Medium | Validate tool-call arguments against the tool's schema before invocation, per `docs/06-tools/tool-interface.md`. | Reject and ask the model to regenerate the call with the schema error explicitly surfaced. |
| **FM-07-005** | Timeout (tool) | Tool call takes longer than expected (network tool, slow disk, hung process). | Elapsed time exceeds the tool's declared timeout budget. | Medium | Every tool declares an expected timeout; enforce it centrally rather than trusting each integration to self-limit. | Kill the call, mark as 'timeout' (distinct from 'failure'), and let the Planner decide retry vs. alternative approach. |
| **FM-07-006** | API unavailable (tool-backed) | External API backing the tool is down. | Connection refused / 5xx from the API. | Medium | Circuit breaker per external API, same pattern as FM-04-019. | Fall back to an alternative tool/approach, or surface the unavailability to the user. |
| **FM-07-007** | Disk full | Write-type tool fails because the target volume has no space. | OS-level ENOSPC error. | High | Pre-flight disk-space check for known-large write operations. | Alert immediately (this often needs human intervention); do not silently retry, since retrying won't help. |
| **FM-07-008** | Network failure (tool) | Transient connectivity loss during a tool call. | Connection reset / DNS failure mid-call. | Medium | Retry with backoff for idempotent tool calls only; never blind-retry non-idempotent calls (e.g. 'send email'). | Distinguish idempotent vs. non-idempotent in the tool schema; only auto-retry the former. |
| **FM-07-009** | Invalid response (tool) | Tool/API returns a response that doesn't match its documented schema. | Response parsing/validation fails. | Medium | Validate every tool response against schema before passing it back into the pipeline; never trust raw output blindly. | Treat as a tool failure, not a silent pass-through of malformed data; surface to Planner for retry/alternative. |
| **FM-07-010** | MCP server offline | Configured MCP server is unreachable. | Connection failure to the MCP server endpoint. | Medium | Health-check MCP servers periodically, not only on first use, and reflect status in the capability registry. | Mark the server's capabilities unavailable until it responds again; route around it per FM-04's fallback logic. |
| **FM-07-011** | MCP wrong protocol | Server speaks a different MCP protocol version than the client expects. | Handshake/negotiation failure at connection time. | Medium | Protocol version negotiation at connect time; reject cleanly rather than proceeding with a mismatched assumption. | Use the highest mutually-supported protocol version, or disable the server if no compatible version exists. |
| **FM-07-012** | MCP invalid schema | Server advertises a tool schema that is malformed or internally inconsistent. | Schema validation of the server's own advertisement fails. | Low | Validate advertised schemas at discovery time before ever offering the tool to the Planner. | Exclude the malformed tool from the registry until the server fixes its advertisement. |
| **FM-07-013** | MCP tool unavailable | Tool was available at discovery time but removed/disabled server-side before invocation. | Invocation fails with a 'not found' error despite being present in the cached registry. | Medium | Short TTL on cached MCP tool listings, or a pre-invocation existence check for high-stakes calls. | Refresh the tool listing and replan without the now-missing tool. |
| **FM-07-014** | MCP permission denied | Server requires a scope/credential the client wasn't granted. | Authorization error from the server. | Medium | Surface required scopes at discovery time so the Planner doesn't even attempt calls it can't be authorized for. | Route through `docs/06-tools/mcp.md`'s Server-side scope denial section's re-authorization flow if the missing scope can be granted; otherwise treat as capability-unavailable. |
| **FM-07-015** | MCP timeout | Server accepts the call but never responds. | No response within the negotiated timeout window. | Medium | Same centralized timeout enforcement as FM-07-005, applied uniformly to MCP calls. | Mark as timeout, not failure; let Planner decide on retry/alternative. |
| **FM-07-016** | MCP wrong capability advertised | Server claims a capability (e.g. 'supports streaming') it doesn't actually implement correctly. | Runtime behavior contradicts the advertised capability metadata. | Medium | Periodic conformance testing against advertised capabilities, not just trusting the advertisement forever. | Downgrade trust in that server's advertised capabilities; flag for manual review, avoid relying on the specific unverified claim. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- A tool that times out and a planner with no timeout-aware retry policy (FM-02) compound into a task that appears 'stuck' with no user-visible signal — every tool call needs a bounded timeout AND the caller needs to treat timeout as a distinct outcome from failure.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
