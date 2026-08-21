# Security Model

## Purpose

The top-level index tying together every security-specific document in
this folder into one coherent model, and stating the security posture
that follows directly from this project's foundational architectural
review: NOVA runs with real OS privilege and real-world side effects, and
its security model is built around that fact rather than treating it as
an afterthought layered on top of a functioning system.

## Scope

Structural overview and cross-references. Each specific mechanism has its
own dedicated document.

## The security model in one paragraph

Every action NOVA can take is classified by risk tier and gated by the
Permission Manager before execution (`permissions.md`,
`docs/03-runtime/permission-manager.md`); every credential is stored in
the OS vault, never inline (`secrets.md`); all persistent memory is
encrypted at rest (`encryption.md`); observed content is structurally
separated from instructions to defend against prompt injection
(`threat-model.md`, `docs/05-ai/prompt-system.md`); every autonomous
action is fully auditable (`audit.md`); and every process is isolated per
the modular service architecture, limiting the blast radius of any single
compromised component (`sandboxing.md`).

## Document index

| Document | Covers |
|---|---|
| `authentication.md` | Who/what is allowed to interact with NOVA at all |
| `authorization.md` | What an authenticated caller/agent is allowed to do |
| `permissions.md` | The risk-tier and confirmation policy for actions |
| `encryption.md` | Protection of data at rest |
| `secrets.md` | Credential storage for AI providers, MCP servers, APIs |
| `sandboxing.md` | Process-level isolation between components |
| `audit.md` | The action audit trail |
| `threat-model.md` | The specific threats this model is designed against, including prompt injection and the GUI-fallback bypass risk |

## Relationship to earlier project decisions

This security model is not a separate layer bolted onto an
already-decided architecture — the risk-tiered execution principle
(`docs/00-overview/design-principles.md`, Principle 4), the ground-truth-
first Verifier (`docs/03-runtime/verifier.md`), and the fixed execution-
priority chain (`docs/06-tools/execution-priority.md`) were all
themselves direct responses to security concerns raised during this
project's foundational review. This folder documents the security-
specific mechanisms in depth; the architectural decisions they implement
are recorded across `docs/02-architecture/` through `docs/06-tools/`.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `docs/15-decisions/adr-0006-security.md` — the ADR ratifying this
  overall model
- Every document listed in the index above
