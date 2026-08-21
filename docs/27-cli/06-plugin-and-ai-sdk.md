# Plugin SDK & AI SDK Commands

## Plugin SDK

| Command | Purpose |
|---|---|
| `nova plugin create` | Scaffold a new plugin from a template, matching `docs/16-extensibility/plugin-architecture.md`'s expected structure |
| `nova plugin validate` | Validate a plugin's manifest against schema, check declared permissions match actual code access patterns (best-effort static check) |
| `nova plugin package` | Build a distributable plugin package |
| `nova plugin publish` | Submit to the marketplace review pipeline (`docs/16-extensibility/plugin-marketplace.md`, `FM-19-001`) |
| `nova plugin test` | Run the plugin's test suite inside the same sandbox it will execute in at runtime (`docs/16-extensibility/plugin-sandboxing.md`) |
| `nova plugin sign` | Sign the package for supply-chain verification (`FM-12-016`) |

`nova plugin validate` is deliberately run automatically as a pre-step inside both `package` and `publish` — a plugin cannot be packaged or
published without passing validation, closing the gap described in
`FM-19-007` (permission manifest not matching runtime access) as early
as possible in the authoring loop, not just at marketplace review time.

## AI SDK

| Command | Purpose |
|---|---|
| `nova agent create` | Scaffold a new sub-agent definition for `docs/24-collaboration/multi-agent-collaboration.md`'s pipeline |
| `nova tool create` | Scaffold a new tool integration matching `docs/06-tools/tool-interface.md`'s schema |
| `nova workflow create` | Scaffold a new workflow definition for `docs/17-workflow/workflow-engine.md` |
| `nova provider test <name>` | Run a live conformance test against a configured provider — the CLI-invocable version of the conformance testing referenced in `FM-07-016` |
| `nova prompt validate` | Validate a prompt template against `docs/05-ai/prompt-versioning.md`'s schema/render checks (the automated counterpart to `FM-06-009` through `011`) |

## `nova tool create` scaffolds include

- The tool's `input_schema`/`output_schema` stubs (validated per
  `docs/06-tools/tool-interface.md`)
- A declared idempotency flag (mandatory field — the scaffold refuses to
  generate without it, directly preventing `FM-23-001`, retry-makes-
  things-worse, at the source)
- A stub test file exercising both success and the tool's declared
  timeout behavior

## Related documents

- `docs/16-extensibility/plugin-architecture.md`, `plugin-sandboxing.md`,
  `plugin-marketplace.md` — full plugin lifecycle detail
- `docs/06-tools/tool-interface.md` — the schema `tool create` scaffolds against - `docs/05-ai/prompt-versioning.md` — what `prompt validate` checks

## Where This Breaks

Failure modes specific to this command group. Cross-referenced from `docs/25-failure-modes/FM-25-cli-infrastructure.md`, which indexes all CLI failure entries in one place.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-25-017** | `nova plugin validate`'s static permission check has false negatives | Static analysis can't catch every dynamic-access pattern (e.g. reflection-based file access), so a plugin passes validation but still violates `FM-12-007` (permission mismatch) at runtime. | Runtime sandbox permission-boundary enforcement (`FM-12-007`'s own detection) still catches it, but later than ideal. | Medium | Treat static validation as a first line of defense, not a substitute for runtime sandbox enforcement — never relax the runtime check because static validation exists. | No CLI-level recovery needed since the runtime check is the actual safety net; improve the static analysis's coverage as a quality improvement, not a security dependency. |
| **FM-25-018** | `nova tool create`'s idempotency-flag requirement is bypassed by copy-pasting an existing tool and flipping the flag without actually verifying it | Scaffold requires the field to be *present*, not that its value is *correct* for the new tool's actual behavior. | Code review misses the mismatch; `FM-23-001` occurs later at runtime. | High | Require idempotency-flag justification (a short comment/test demonstrating the claim) as part of the scaffold, not just a boolean with no evidence. | Fix the flag and add the missing idempotency test; audit other tools created via the same copy-paste pattern for the same risk. |
| **FM-25-019** | `nova provider test` passes against a sandboxed/test credential but the production credential has different scopes | Test credential has broader permissions than what's actually configured for production use. | Production `FM-04-017` (capability permission mismatch) despite a passing `provider test`. | Medium | `provider test` must test against the actual configured production credential (read-only conformance calls only) where safe, not a separate test-only credential with different scope. | Align test and production credential scopes, or clearly label the test as scope-limited so a passing result isn't over-trusted. |
