# Error Catalog

## Purpose

The exhaustive, stable error-code catalog. `docs/06-tools/error-codes.md`
defines the namespace/prefix scheme and a handful of illustrative
examples; this document is the full catalog every one of those prefixes
expands into, generated from and cross-referenced to the failure-mode
catalog in `docs/25-failure-modes/` so that every catalogued failure with
Medium-or-higher severity has a stable code an agent can branch on
programmatically instead of parsing free-text error messages.

## Code structure (recap)

`NOVA-<PREFIX><###>` — prefix identifies subsystem, number is stable and
never reused. See `docs/06-tools/error-codes.md` for the full prefix
table; the codes below are illustrative of the pattern per prefix, not
the complete enumeration for every prefix (new codes are appended, never
renumbered, as failure modes are discovered — see `02-startup-sequence.md`'s
sibling files' "Where This Breaks" sections for the process risk of this
catalog itself drifting).

## Catalog

| Code | Name | Subsystem | Primary Recovery Action | Cross-ref |
|---|---|---|---|---|
| `NOVA-MEM001` | Memory storage corruption detected | Memory | Restore from last valid WAL checkpoint | `FM-01-005` |
| `NOVA-MEM002` | Knowledge Graph cycle detected on write | Memory | Reject write, surface to caller | `docs/00-overview/system-invariants.md` |
| `NOVA-MEM003` | Cross-identity memory access attempted | Memory | Block, purge from downstream cache, audit | `FM-01-009`, `FM-12-010` |
| `NOVA-MEM004` | Embedding dimension mismatch on insert | Memory | Reject write; one index per model+version | `FM-01-019` |
| `NOVA-MEM005` | Vector index corruption | Memory | Rebuild index from source-of-truth store | `FM-01-020` |
| `NOVA-MEM006` | Retrieval confidence below usable threshold | Memory | Return "insufficient context," do not guess | `FM-01-015` |
| `NOVA-TSK001` | Plan validation failed: cycle detected | Task/Planner | Reject plan, replan | `FM-02-006` |
| `NOVA-TSK002` | Plan references unavailable capability | Task/Planner | Replan with substitute or surface to user | `FM-02-005` |
| `NOVA-TSK003` | Task exceeded step/time/recursion budget | Task/Planner | Halt task chain, require manual review | `FM-02-008` |
| `NOVA-TSK004` | Task marked complete without independent verification | Task/Verifier | Reopen as Unverified | `FM-05-016` |
| `NOVA-TSK005` | Task lost (no queue entry for referenced ID) | Task Manager | Reconstruct from request log or surface loss | `FM-02-009` |
| `NOVA-TL001` | Tool invocation timed out | Tools | Mark as timeout (distinct from failure), let Planner decide | `FM-07-005` |
| `NOVA-TL002` | Tool returned result violating declared output schema | Tools | Reject, treat as tool failure, retry/alternative | `FM-07-009` |
| `NOVA-TL003` | Tool call arguments failed schema validation | Tools | Reject before invocation, ask model to regenerate | `FM-07-004` |
| `NOVA-TL004` | Required binary/dependency missing | Tools | Surface install-required message | `FM-07-001` |
| `NOVA-TL005` | PermissionDenied (OS/filesystem-level, distinct from a NOVA authorization denial) | Tools | Abort that path only; surface a specific, actionable message; do not halt the surrounding task | `docs/37-edge-cases/permission-denied-filesystem.md` |
| `NOVA-MCP001` | MCP server unreachable | Tools/MCP | Mark capabilities unavailable, route around | `FM-07-010` |
| `NOVA-MCP002` | MCP protocol version mismatch | Tools/MCP | Use highest mutually-supported version or disable | `FM-07-011` |
| `NOVA-AI001` | All configured providers exhausted for a call | AI/Router | Surface explicit "all providers unavailable" | `FM-04-010` |
| `NOVA-AI002` | Provider capability advertisement doesn't match runtime behavior | AI/Router | Downgrade trust in server's advertised capabilities | `FM-04-018`, `FM-07-016` |
| `NOVA-AI003` | Context assembly exceeded model context limit | AI/Context | Trim by priority and retry within budget | `FM-06-005` |
| `NOVA-AI004` | Output failed to ground in retrieved context (possible hallucination) | AI/Reasoning | Flag as ungrounded before delivery, regenerate | `FM-05-001` |
| `NOVA-AI005` | Response state claim contradicts actual system state | AI/Reasoning | Re-verify actual state before reporting | `FM-05-015` |
| `NOVA-SEC001` | Destructive action attempted without confirmation | Security | Block; treated as Critical incident | `FM-18-001` |
| `NOVA-SEC002` | Plugin signature verification failed | Security | Block plugin load | `FM-12-016` |
| `NOVA-SEC003` | Prompt injection pattern detected in assembled context | Security | Strip/quarantine source; log to audit | `FM-06-013`, `FM-06-008` |
| `NOVA-SEC004` | Privilege escalation beyond granted scope detected | Security | Revoke access, audit, treat as incident | `FM-12-004` |
| `NOVA-SEC005` | Sandbox boundary violation detected | Security | Kill sandbox immediately, audit, contain | `FM-12-005` |
| `NOVA-SEC006` | Secret detected in outbound content | Security | Block send, rotate credential, scrub logs | `FM-12-001` |
| `NOVA-PLG001` | Plugin dependency unresolved at enable time | Plugins | Block enable, surface diagnostic | `FM-19-003` |
| `NOVA-PLG002` | Plugin crashed during execution | Plugins | Restart sandbox in isolation | `FM-19-002` |
| `NOVA-PLG003` | Plugin accessed resource outside declared manifest | Plugins | Block access, flag for review | `FM-19-007`, `FM-12-007` |
| `NOVA-NET001` | External API contract mismatch (unexpected response shape) | Network | Schema-validate, treat as failure not silent pass | `FM-11-012` |
| `NOVA-NET002` | Rate limit exceeded | Network | Respect `Retry-After`, back off | `FM-11-007` |
| `NOVA-NET003` | Credential expired or revoked | Network | Prompt for re-authentication | `FM-11-009` |
| `NOVA-CFG001` | Invalid configuration value (schema validation failed) | Config | Reject at load, surface specific field | `FM-15-004` |
| `NOVA-CFG002` | Required environment variable missing at startup | Config | Fail startup with named-variable error | `FM-20-002` |
| `NOVA-WFL001` | Workflow node disappeared or violated the workflow graph contract | Workflow | Stop execution, persist checkpoint, surface failure | `FM-02-016` |
| `NOVA-WFL002` | Workflow execution exceeded a bound or failed verification | Workflow | Stop execution, persist checkpoint, route to recovery/manual review | `FM-02-017` |
| `NOVA-EVT001` | Event causality chain exceeded max-hop ceiling | Event Bus | Break loop, reject events past ceiling | `FM-15-028` |
| `NOVA-EVT002` | Subscriber failed processing event with no defined policy | Event Bus | Route to dead-letter queue | `FM-15-029` |
| `NOVA-SYNC001` | Split-brain state detected across devices | Multi-Device | Merge via conflict resolution; surface unresolvable to user | `FM-10-017` |
| `NOVA-SYNC002` | Duplicate execution detected across devices | Multi-Device | Keep first-completed, rollback duplicate via compensation | `FM-10-019` |

## How to allocate a new code

1. Find the entry in `docs/25-failure-modes/` that describes the failure.2. Pick the prefix matching its subsystem from `docs/06-tools/error-codes.md`.
3. Allocate the next unused sequence number for that prefix — never reuse
   a retired number, per that document's stability guarantee.
4. Add a row here with a cross-reference to the FM ID.
5. Add the code to the doc-lint check described in
   `11-documentation-lint-ci.md` so an orphaned FM entry (Medium+ severity,
   no error code) or an orphaned code (no FM cross-reference) fails CI.

## Related documents

- `docs/06-tools/error-codes.md` — namespace, prefix table, allocation rules
- `docs/25-failure-modes/` — the source failure catalog this table maps to codes
- `docs/03-runtime/failure-recovery.md` — the general recovery-strategy
  taxonomy (retry/rollback/compensation) each code's recovery action draws from

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-016** | Catalog entry drifts from actual thrown error | Code changes what triggers `NOVA-XXXNNN` without updating this table's Trigger/Recovery description. | Contract test asserts the code is actually raised under the documented trigger condition. | Medium | Require a catalog-table diff in any PR that changes error-raising logic, checked by the doc-lint process. | Correct the table entry to match actual behavior, or fix the code if the documented behavior was the intended contract. |
| **FM-24-017** | Orphaned FM entry with no error code | A Medium+ severity failure mode is cataloged in `docs/25-failure-modes/` but has no corresponding `NOVA-` code, so callers can't branch on it programmatically. | Doc-lint cross-reference check (see `11-documentation-lint-ci.md`) flags FM entries above a severity threshold with no matching code. | Medium | Make code allocation part of the FM-authoring checklist for anything Medium or above, not an afterthought. | Allocate the missing code retroactively; do not renumber existing codes to make room. |
| **FM-24-018** | Two different failures share one code | Sloppy reuse causes ambiguity in what a caller should actually do on receipt of that code. | Code review / doc-lint flags a code with more than one distinct FM cross-reference where the recoveries differ. | Medium | One code per distinct recovery action, even if two failures share a subsystem — never overload a single code for two different required responses. | Split into two codes; deprecate (never delete) the ambiguous shared usage and document the split clearly. |
