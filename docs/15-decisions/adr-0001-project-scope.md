# ADR-0001: Project Scope

## Status
Accepted

## Context

The original NOVA concept described 24 sections of capability — full
system observation, universal AI provider/MCP support, multi-agent
orchestration, GUI/vision automation, cross-device sync — with no stated
v1 boundary, target platform, or licensing model. An architectural review
of that concept identified unbounded scope, not any single technical
unknown, as the project's central risk: as originally written, nothing
was shippable until nearly the entire system existed, since every
capability was treated as equally foundational.

## Decision

NOVA's v1 scope is fixed as follows:

- **Platform:** Windows, single machine, single OS user account per
  workspace.
- **Licensing:** Fully open source (MIT). No bundled paid service; users
  supply their own AI provider API key, run a local model, or both.
- **Core v1 services:** Observer, Memory, Knowledge Graph, Planner,
  Executor, Verifier, Tool Registry — everything else is built in later
  phases per `ROADMAP.md`.
- **Execution:** Included from v1, but risk-tiered, with GUI/vision
  control present but always last-resort and restricted to an explicit
  application allow-list.
- **Users:** Power users (developers, AI engineers, researchers,
  technical creators) — general consumer personas are explicitly
  deferred.

## Alternatives Considered

- **Building all 24 sections in parallel** — rejected because it
  reproduces the exact unbounded-scope risk the review identified;
  nothing would be demoable or testable until the entire system existed.
- **Cross-platform v1** — rejected because Windows UI Automation,
  macOS's Accessibility API, and Linux's AT-SPI/X11/Wayland landscape are
  three separate engineering efforts, not variations on one; attempting
  all three in v1 would triple the surface area of the riskiest,
  least-mature capability (GUI automation) for no v1-relevant benefit.
- **A hosted/cloud multi-tenant version** — rejected because it
  contradicts the local-first, no-vendor-lock-in identity and introduces
  a substantial new security and infrastructure surface (multi-tenant
  data isolation, hosted backend security) with no stated demand
  justifying it for v1.

## Consequences

This decision makes it possible to define a genuine, demoable v1 (memory
and retrieval, per Phase 1) and a clear, bounded path to a full working
system (per `ROADMAP.md`'s five phases). It forecloses, for the current
scope, any multi-device, multi-user, or cross-platform capability — these
remain explicitly on the Phase 5 roadmap but are not designed or built
against in the current phase.

## Related Documents

- `docs/01-product/project-scope.md` — the product-level restatement of
  this decision
- `docs/00-overview/non-goals.md` — the detailed exclusion list this ADR
  ratifies
- `ROADMAP.md` — the phased path this scope decision enables
