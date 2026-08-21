# Module Contract Standard

## Purpose

Defines the standard contract format every service and module in this
repository must expose and document: input, output, errors, timeout,
and permissions — making explicit a convention most existing documents
already follow implicitly, so it is checked consistently for new modules
going forward rather than relying on each author noticing the pattern.

## Scope

The documentation convention itself. This does not retroactively rewrite
every existing service document — most already convey this information
within their Responsibilities and interaction sections; this standard is
the explicit checklist new and revised documents are held to.

## The standard contract block

Every module's architecture document must be able to answer, either in
a dedicated "Contract" section or clearly within existing sections:

- **Input** — what the module accepts, and from which caller(s), per
  `docs/02-architecture/service-architecture.md`'s inputs/outputs table
  convention.
- **Output** — what the module produces, in what structure.
- **Errors** — what error conditions the module can produce and how they
  are surfaced (e.g., a structured error type, a specific message topic).
- **Timeout** — what the module's own operations are bounded by, and what
  happens on timeout (consistent with `docs/03-runtime/failure-recovery.md`'s
  timeout strategy, for any module whose operations can take meaningful
  time).
- **Permissions** — what authorization or risk-tier requirements gate the
  module's operation, per `docs/10-security/authorization.md` and `docs/10-security/permissions.md`.

## Example: applying the standard to an existing module

`docs/03-runtime/executor.md` already implicitly satisfies this standard:
its "Execution contract" section states input (a tool call specification
from the Planner), output (the structured result per
`docs/06-tools/tool-interface.md`), errors (partial/failure status
within that same structured result), and it references the Permission
Manager gate for the permissions dimension. Its per-tool timeout handling
is detailed in `docs/06-tools/cli.md` for the CLI tier specifically. A
new module document must make these five dimensions explicit,
consolidated under one "Contract" section rather than scattered, unless the module is small enough that all five are already obvious within a single existing section.

## Application to new modules

Any new service, tool tier, or major component document added to this
repository going forward must include an explicit "Contract" section
using this five-part structure, checked as part of the module checklist
(`docs/14-development/module-checklist.md`).

## Why this is a standard rather than a retroactive rewrite

Rewriting all existing service documents purely to add a formally labeled
"Contract" section where the same information is already present, just
organized under different headings, would be a cosmetic change with no
functional benefit and a real risk of introducing inconsistency during
the rewrite — this standard is applied going forward and opportunistically
during otherwise-motivated revisions, not as a standalone rewrite pass.

## Related documents

- `docs/02-architecture/service-architecture.md` — the existing
  inputs/outputs table this standard formalizes
- `docs/14-development/module-checklist.md` — where this standard is
  checked for new/revised modules
- `docs/03-runtime/failure-recovery.md` — timeout and error-handling
  detail referenced above
