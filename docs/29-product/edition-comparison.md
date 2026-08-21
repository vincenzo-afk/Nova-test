# Edition Comparison

## Status: explicit non-goal, not a pending TODO

NOVA ships exactly one edition — single-user, fully local-capable — and
this is a **Required** decision (`docs/00-implementation-governance/decision-authority-matrix.md`),
not a temporary state awaiting more editions. There is no "Pro" or
"Team" tier to build toward, no `if (isPro)` branch to leave room for,
and no second edition planned. This file exists only to give a single,
explicit answer — one edition, no comparison possible — rather than
leaving the question unanswered for someone to wonder about.

## Why this file exists at all

If a future team/managed edition is ever approved, it would be approved
via ADR (`docs/15-decisions/`), and *that* ADR — not silent code
changes — is what would populate this file with real comparison rows and
authorize any edition-conditional logic in the codebase. Until such an
ADR exists, an AI agent finding this file states plainly, if asked, that
NOVA has one edition — it does not treat this file's structure as
license to start building multi-edition branching logic.
