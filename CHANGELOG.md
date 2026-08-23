# Changelog

All notable changes to Nova are documented in this file.

## [0.1.0] - 2026-08-21

### Added

- TypeScript monorepo foundations for shared contracts, runtime services, memory, observers, state, and Electron desktop surfaces.
- Planner, executor, verifier, task management, tools, model routing, workflows, plugins, providers, credentials, diagnostics, backup, restore, and operational recovery boundaries.
- Cross-device pairing, sync, logical clocks, distributed Full Peer task scheduling, voice wake-claim coordination, channels, multi-agent coordination, and incident lifecycle management.
- Named-pipe CommunicationBus, API Gateway, real RuntimeApplication composition root wired into Electron main, authoritative task-status IPC retrieval and renderer refresh, Prisma/SQLite immutable task checkpoints with write-before-acknowledgment and crash recovery remapping, Planner/Permission Manager/Executor/Verifier Runtime Task Coordinator, correlated task-progress events, authenticated local REST task submission/status/list/cancel, memory search, memory-record lookup with lineage, bounded Knowledge Graph queries, permission listing/update endpoints, configuration listing/section-update endpoints, real webhook registration through the authenticated external event boundary, and authenticated WebSocket event streaming with live delivery, topic authorization, bounded replay, and backpressure handling, authenticated REST tool listing and plugin-tool registration with independent scopes, signed webhook delivery with retry and health handling, secure Electron preload bridge, guided onboarding, performance-budget evaluation, integration tests, simulations, chaos tests, filesystem E2E tests, and documentation-link verification.
- Production repository documentation, contribution infrastructure, security policy, issue forms, pull-request guidance, and CI workflow.
- Electron desktop host persistence bootstrap with a stable per-user workspace UUID, canonical `memory/structured/nova.db` path, forward migration application, Prisma `TaskCheckpointStore` injection, durable gateway submission, and orderly Prisma shutdown.
- Real Groq OpenAI-compatible LLM provider adapter with vault-reference credential resolution, authenticated model health checks, chat-completion translation, strict response validation, and deterministic-router compatibility; no provider key is stored inline or exposed to the renderer.
- Cross-platform IPC hardening with deterministic Windows named-pipe mapping and explicit readiness handshaking, plus Windows filesystem-observer path identity preservation while retaining canonical security checks.

### Verification

The repository’s release checkpoint includes the current Vitest suite, recursive TypeScript typecheck, ESLint, Prettier, documentation-link validation, and Electron production build. Run `pnpm verify` and `pnpm --filter @nova/desktop build` for the current local gate.
