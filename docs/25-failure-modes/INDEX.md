# Failure Modes Index

This folder is NOVA's project-wide failure-mode catalog: every place the system can break, organized by subsystem, with a trigger condition, detection method, severity, mitigation, and recovery procedure for each one. It exists so that any contributor — human or AI agent — implementing a NOVA subsystem can check what can go wrong *before* writing the code, not discover it in production.

## How to use this folder

1. Before implementing a subsystem, read its corresponding FM file(s) and treat every 'Mitigation' cell as a design requirement, not an optional nice-to-have.
2. Every 'Detection' cell must map to an actual metric, log, or test — if it doesn't, that's itself a gap (see FM-17, Observability).
3. Every 'Critical' or 'High' severity item must have a corresponding test in `docs/12-testing/chaos-tests.md` that deliberately triggers it and verifies the recovery path actually works.
4. When you discover a new failure mode not listed here, add it — this catalog is a living document, not a fixed spec.

## Files

| File | Covers |
|---|---|
| [`FM-01-memory-and-knowledge-graph.md`](FM-01-memory-and-knowledge-graph.md) | Memory, Knowledge Graph, Embeddings & Retrieval |
| [`FM-02-planner-task-queue-scheduler.md`](FM-02-planner-task-queue-scheduler.md) | Planner, Task Queue, Workflow Engine & Scheduler |
| [`FM-03-agent-orchestration-and-collaboration.md`](FM-03-agent-orchestration-and-collaboration.md) | Agent Orchestration & Multi-Agent Collaboration |
| [`FM-04-model-router-provider-fallback.md`](FM-04-model-router-provider-fallback.md) | Model Router, Provider Layer, Fallback Engine & Capability Management |
| [`FM-05-llm-core-and-ai-specific-failures.md`](FM-05-llm-core-and-ai-specific-failures.md) | LLM Core Behavior & AI-Specific Failure Modes |
| [`FM-06-context-prompt-session.md`](FM-06-context-prompt-session.md) | Context Assembly, Prompt Construction & Session Management |
| [`FM-07-tool-execution-and-mcp.md`](FM-07-tool-execution-and-mcp.md) | Tool Execution & MCP (Model Context Protocol) |
| [`FM-08-code-generation-and-testing.md`](FM-08-code-generation-and-testing.md) | Code Generation & Testing |
| [`FM-09-browser-and-vision.md`](FM-09-browser-and-vision.md) | Browser Automation & Vision |
| [`FM-10-desktop-android-distributed-sync.md`](FM-10-desktop-android-distributed-sync.md) | Desktop Automation, Android, Distributed Devices & Sync |
| [`FM-11-internet-and-external-apis.md`](FM-11-internet-and-external-apis.md) | Internet Connectivity & External APIs |
| [`FM-12-security-sandbox-identity.md`](FM-12-security-sandbox-identity.md) | Security, Sandboxing & Identity Layer |
| [`FM-13-voice-tts-localization.md`](FM-13-voice-tts-localization.md) | Voice, Text-to-Speech & Localization |
| [`FM-14-files-storage-documents-cache.md`](FM-14-files-storage-documents-cache.md) | Files, Storage, Document Processing & Cache |
| [`FM-15-architecture-runtime-lifecycle-events.md`](FM-15-architecture-runtime-lifecycle-events.md) | Architecture, Runtime Lifecycle, State Machine & Event System |
| [`FM-16-resource-management-and-performance.md`](FM-16-resource-management-and-performance.md) | Resource Management & Performance |
| [`FM-17-observability.md`](FM-17-observability.md) | Observability (Logging, Metrics, Tracing) |
| [`FM-18-autonomy-policy-approval.md`](FM-18-autonomy-policy-approval.md) | Autonomous Decisions, Policy Engine & Human Approval |
| [`FM-19-plugin-ecosystem.md`](FM-19-plugin-ecosystem.md) | Plugin Ecosystem & Extensibility |
| [`FM-20-deployment-and-evolution.md`](FM-20-deployment-and-evolution.md) | Deployment & Evolution Failures |
| [`FM-21-catastrophic-failures.md`](FM-21-catastrophic-failures.md) | Catastrophic Failures |
| [`FM-22-user-interaction-and-analytics.md`](FM-22-user-interaction-and-analytics.md) | User Interaction & Analytics |
| [`FM-23-recovery-system-meta-failures.md`](FM-23-recovery-system-meta-failures.md) | Recovery System (Meta-Failures) |
| [`FM-24-documentation-and-reference-integrity.md`](FM-24-documentation-and-reference-integrity.md) | Documentation & Reference Integrity — covers `docs/26-system-reference/` drifting from the system it describes |
| [`FM-25-cli-infrastructure.md`](FM-25-cli-infrastructure.md) | CLI Infrastructure — failures across `docs/27-cli/`'s bootstrap, health, dev, AI-developer-tool, observability, SDK, and CI commands |
| [`FM-26-multi-device-protocol.md`](FM-26-multi-device-protocol.md) | Multi-Device Protocol — failures across `docs/28-multi-device-protocol/`'s sync, pairing, handoff, networking, state, permissions, and recovery documents |
| [`FM-27-external-api-surface.md`](FM-27-external-api-surface.md) | NOVA's Own External API Surface — REST, WebSocket, SDK, webhooks, and the versioning contract across `docs/08-api/` (the inbound direction; see FM-11 for the outbound direction) |

## Numbering Convention

Each file uses a stable `FM-NN-0XX` ID scheme (e.g. `FM-01-005`). IDs are never reused or renumbered even if a failure mode is later merged/split, so historical references (incident reports, code comments citing an FM ID) remain valid.

## Relationship to `docs/03-runtime/failure-recovery.md`

That document is the authoritative reference for *how NOVA recovers* (retries, rollback, compensation, checkpoints, idempotency) as general mechanisms. This folder is the authoritative reference for *what can go wrong*, subsystem by subsystem, and which of those general mechanisms applies to each specific case. `FM-23-recovery-system-meta-failures.md` covers the case where the recovery mechanisms themselves fail.
