# Product Specification

## Purpose

The authoritative description of what NOVA does as a product, independent
of internal architecture. Where `docs/00-overview/vision.md` states
identity and intent, this document states capability: what a user can
actually ask NOVA to do, organized by category.

## Scope

Product-level capability description for the current phase (see
`project-scope.md` for the precise v1 boundary and `ROADMAP.md` for what
comes later). Internal implementation of any capability below is
documented in `docs/02-architecture/` onward (Tier 2/3).

## Capability categories

### Understand
NOVA answers questions grounded in the user's own observed data:
explaining what a project is, recalling a past conversation or decision,
finding a file the user has forgotten the name or location of, and
describing relationships between projects, files, and tasks via the
knowledge graph.

### Remember
NOVA maintains memory across working, recent, and long-term tiers plus the
knowledge graph, so that context persists across sessions, not just within
one conversation. See `docs/04-memory/` (Tier 2).

### Observe
With explicit, per-source, revocable permission, NOVA continuously
observes files, applications, windows, browser activity, git repositories,
containers, and clipboard content, in order to keep its understanding of
the workspace current. See `docs/07-observers/` (Tier 3).

### Reason
Given a goal, NOVA determines whether it can be solved deterministically
or requires planning/inference, following the decision flow in
`docs/05-ai/ambiguity-resolution.md` (Tier 2). It can break a goal into
steps, select tools, and re-plan if a step fails.

### Act
NOVA performs actions using the lowest-risk, most reliable method
available for the specific task — native API, MCP, CLI, accessibility
control, or, as a last resort, vision-guided keyboard/mouse control. See
`docs/06-tools/execution-priority.md` (Tier 2).

### Verify
After acting, NOVA confirms whether the action's intended outcome actually
occurred, using ground-truth signals wherever available. If verification
fails, NOVA can retry, attempt recovery, choose a different method, or ask
the user for help — but never reports success without evidence.

### Orchestrate
For multi-step goals, NOVA coordinates a planner and, as needed,
specialized task instances (research, coding, file, browser, verification)
that are all instantiations of one parameterized agent runtime — not
separately implemented agent types. See `docs/05-ai/planner-agent.md`
(Tier 2).

### Integrate
NOVA supports multiple AI providers and models (including local models),
MCP servers, and external tools through configuration rather than
hardcoding, without requiring the user to be tied to a single provider.

## Target platform (v1)

Windows, single machine, single user. See `project-scope.md` for the full boundary and `docs/00-overview/non-goals.md` for what is explicitly
excluded.

## Interfaces

Desktop application, floating overlay, chat, command palette, tray icon,
and a public API/SDK — all backed by the same runtime and the same memory
state. See `docs/09-ui/` (Tier 3) and `docs/08-api/` (Tier 3).

## Related documents

- `user-personas.md` — who this specification is written for
- `use-cases.md` — concrete examples of the capabilities above in action
- `project-scope.md` — the precise v1 boundary
- `feature-list.md` — the exhaustive feature breakdown with V1/Future
  tagging
