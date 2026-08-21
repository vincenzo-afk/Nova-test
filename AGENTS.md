# AGENTS.md — Read This Before Writing Any Code

This file is for AI coding agents (Claude, Cursor, Copilot, or any other
tool that reads an agent-entrypoint file automatically). It is not a
replacement for the full specification — it is the minimum set of rules
that must never be silently violated, distilled from the full governance
layer at `docs/00-implementation-governance/` and from this
specification's own hardening history. If anything here seems to
conflict with a more detailed document, the detailed document wins per
`docs/00-overview/normative-precedence.md` — but check here first,
because these are the rules most often violated by an agent moving fast.

## The one rule above all others

If two or more valid implementations of something exist, **do not
choose**. Search the documentation. If it's still ambiguous, stop and
ask. Never write "I assumed..." and proceed — see
`docs/00-implementation-governance/ambiguity-policy.md`.

## Before touching any subsystem

1. Read that subsystem's entry in
   `docs/26-system-reference/15-build-contracts.md` — its Can/Cannot/
   Must-never lines are the fastest way to learn what you're not allowed
   to do there.
2. Read `docs/25-failure-modes/INDEX.md`, find the file for this
   subsystem, and read it in full — not skimmed.
3. Check `docs/26-system-reference/16-lifecycle-and-state-machine-index.md` for whether this subsystem has a canonical state machine. If it
   does, that document names the one canonical source — never invent a
   state name, and never assume a state machine you haven't verified
   against its real, cited source. **This specification's own audit
   found six separate entities (Task, Agent, Workspace, Tool, Provider,
   Plugin) where a derived document had silently drifted from its real
   source and asserted states that never existed anywhere — verify
   against the source every time, not against another summary of it.**

## Hard rules that apply everywhere

- **The Executor never reads Memory directly.** It executes pre-resolved
  plan steps handed to it by the Planner. If you find yourself wiring
  the Executor to Memory, stop — that dependency doesn't exist in the
  real architecture.
- **Every tool action declares `idempotent: true/false` explicitly at
  registration — no default.** An action with no declared value is
  never eligible for automatic retry. This isn't a style nit: a missing
  idempotency flag is exactly the class of gap that lets a retry
  duplicate a real-world side effect (a duplicate payment, a duplicate
  send).
- **Every action's `verification_signal` is explicit at registration.**
  A tool with no real verification signal is registered as
  confirmation-required-only — never assume a default that widens what
  it's allowed to do unattended.
- **No magic numbers, no dead code, no stubbed functions presented as
  done.** A function body of `pass`/`// TODO`/"not implemented" is not a
  completed deliverable regardless of what the PR says.
- **No hallucinated imports or APIs.** Every import must resolve to a
  real, installed package at the version in
  `docs/14-development/technology-stack.md`; every method called on it
  must exist in that package's real API — verify against the actual
  installed package, not a remembered similar-sounding one.
- **No hardcoded credentials, paths, or OS-specific assumptions.**
  Credentials go through `docs/10-security/secrets.md`'s vault pattern.
  Paths are canonicalized and containment-checked before use — a
  `../`-style path or symlink escape out of a granted folder scope is
  rejected, never silently followed.
- **A field/schema/API change is not complete until its consumers,
  tests, and documentation change in the same commit.** See
  `docs/26-system-reference/20-versioning-contracts.md`'s Atomic update
  checklist. "I'll update the docs in a follow-up" is not an acceptable
  plan.
- **Deterministic-before-intelligent, always.** Before reaching for an
  LLM call, confirm no deterministic path already solves the problem —
  see `docs/05-ai/deterministic-first.md`. The proportion of tasks
  resolved without any LLM call must not decrease as new capability is
  added.
- **State-machine code requires 100% branch coverage on every documented
  transition**, including every documented *illegal* transition being
  confirmed rejected — see
  `docs/12-testing/testing-strategy.md`'s Coverage minimums for
  state-transition logic.
- **Write the failing test before the implementation**, for any new
  component, endpoint, or state transition — see
  `docs/12-testing/testing-strategy.md`'s Tests before code section.

## Before declaring anything "done"

Read `docs/00-implementation-governance/definition-of-done.md` and
`docs/43-ai-development/review-checklist.md` in full. Partial
completion presented as completion is the single most common way an
agent's otherwise-good work fails review here.

## Full governance layer

`docs/00-implementation-governance/` — Constitution, Decision Authority
Matrix, technology/architecture locks, ambiguity policy, code-generation
rules, documentation precedence, canonical patterns, definition of done,
quality gates, forbidden/allowed decisions, project constraints, and the
implementation checklist. Read that whole directory before writing any
non-trivial code, not just this file.
