# Engineering Principles

## Relationship to the governance folder

`docs/00-implementation-governance/implementation-rules.md` is the
checklist-form summary of this document's content, for quick reference
during a task. This file is the full reasoning behind each principle. If
the two disagree, this file is correct; fix the summary, per
`docs/00-implementation-governance/documentation-precedence.md`.

## Purpose

`design-principles.md` states the five principles every *product and
architectural* decision must satisfy. This document is the companion for
*implementation-level* decisions — the rules that govern how code gets
written, not what the system does. Where `design-principles.md` answers
"should NOVA do this at all, and in what shape," this document answers
"given that we're building it, how do we build it so it stays correct
under change." `docs/14-development/coding-standards.md` and `docs/14-development/architecture-rules.md` enforce these principles at
the file and module level; this document explains why those rules exist.

## Scope

Applies to every line of code, every schema, and every contract in the
repository, human-written or AI-generated. It does not apply to product
scope decisions (`non-goals.md`) or UX decisions (`docs/30-design/`).

## The principles

### 1. Contracts before code

No component is implemented before its entry in
`docs/26-system-reference/` (or the relevant component spec under
`docs/03-runtime/`, `docs/18-providers/`, etc.) defines its public API,
inputs, outputs, and failure behavior. A contract that doesn't exist yet
is not an implementation detail to fill in later — it is a blocker. This
is the concrete engineering consequence of Design Principle 2
(Observe → Remember → Reason → Act → Verify): a component that skips
"reason" (spec) before "act" (code) reproduces the same failure mode at
build time that an ungrounded agent reproduces at runtime.

### 2. Explicit over implicit

Every dependency, every piece of shared state, and every assumption is
named somewhere a reader — human or AI — can find it without inferring it
from behavior. Implicit coupling (two modules that only work together
because of undocumented call order, or a plugin that "happens" to work
because of a global it shouldn't reach) is treated as a defect even if
current tests pass, because it fails silently the moment either side
changes independently. `docs/14-development/anti-patterns.md` enumerates
the concrete forms this takes.

### 3. Composition over inheritance

Capability is added by composing smaller, single-responsibility units
(services, tools, plugins) rather than by extending a shared base class
hierarchy. Inheritance concentrates knowledge of every subtype in one
place and makes independent evolution — a requirement of the modular
runtime architecture in `design-principles.md` — harder over time, not
easier.

### 4. Loose coupling, strong contracts

Modules interact only through their declared public API and the event
bus (`docs/02-architecture/event-bus-specification.md`) — never through
shared mutable state, reflection into another module's internals, or
undocumented side channels. The contract must be strict (validated
schemas, explicit error types); the coupling must be loose (either side
can be replaced without the other knowing).

### 5. Idempotency and cancellation by default

Every operation that mutates state is written to be safely retryable,
and every long-running operation is written to be safely cancellable,
from the first implementation — not added later as a fix. Retrying is
the default recovery strategy across the system
(`docs/03-runtime/failure-recovery.md`,
`docs/25-failure-modes/INDEX.md`); an operation that cannot tolerate a
retry is the exception that must be explicitly documented, not the
default assumption.

### 6. Tests are part of the contract, not a check on it

A public API without tests is an unfinished API, not a finished API
awaiting tests. Tests encode the contract in an executable form; a
contract that isn't tested is a claim, not a guarantee. See
`docs/12-testing/testing-strategy.md`.

### 7. No silent failure

Every error is either handled, surfaced, or logged with enough context
to diagnose it — never swallowed. A `catch` block with no rethrow, log,
or explicit "safe to ignore because X" comment is treated as a defect.
See `docs/26-system-reference/06-error-catalog.md` for the full error
taxonomy this principle is checked against.

## Relationship to AI-generated code

These principles apply identically whether a human or an AI agent writes
the code. `docs/43-ai-development/coding-guidelines.md` and the AI
Implementation Protocol (Section 32 of the master outline; see
`ai-implementation-philosophy.md`) translate them into a concrete
pre-flight and self-review checklist so an AI implementer can verify
compliance mechanically rather than by judgment call.

## Precedence

Where an engineering principle here appears to conflict with a design
principle in `design-principles.md`, the design principle wins — these
are subordinate, implementation-level principles, not co-equal ones. See
`normative-precedence.md`.
