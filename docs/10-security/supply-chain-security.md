# Supply Chain Security

## Purpose

Expands the brief signing/trust mention in
`docs/16-extensibility/plugin-marketplace.md` into a complete supply-
chain security specification: signature verification, dependency
verification, a software bill of materials, hash validation, and trusted
publisher status.

## Scope

Supply-chain integrity for plugins and, where applicable, MCP servers.
Runtime sandboxing of already-installed plugin code is
`docs/10-security/sandboxing.md`; this document covers verifying what is
being installed in the first place.

## Signature verification

Every plugin package is signed by its publisher (per
`docs/16-extensibility/plugin-marketplace.md`) using a key the
marketplace index associates with that publisher. Installation
verifies this signature before any other step — an unsigned or
signature-mismatched package is rejected outright, never installed with
a warning-only prompt.

## Software Bill of Materials (SBOM)

Every plugin package includes an SBOM listing its own code dependencies
(libraries, versions) alongside the manifest described in
`docs/16-extensibility/plugin-architecture.md`. The SBOM is checked
against known-vulnerable version databases at install time and on a
recurring schedule thereafter (via the Job Scheduler,
`docs/03-runtime/job-scheduler.md`) — a plugin whose SBOM reveals a newly
disclosed vulnerability in one of its dependencies is flagged to the
user, mirroring the deprecation-surfacing behavior in
`docs/16-extensibility/plugin-lifecycle.md`, without requiring the
plugin's own publisher to have issued an update yet.

## Dependency verification

Where a plugin declares a dependency on another plugin
(`docs/16-extensibility/plugin-dependencies.md`), that dependency's own
signature and SBOM are verified transitively — a plugin is not
considered verified merely because its own signature checks out if a
declared dependency fails its own verification.

## Hash validation

Beyond signature verification (which confirms authorship), the package's
content hash is validated against the hash recorded in the marketplace
index entry (`docs/16-extensibility/plugin-marketplace.md`) at download
time, confirming the downloaded bytes match exactly what the index
described — this catches corruption or a compromised distribution
mirror independent of signature validity.

## Trusted publisher status

A publisher can accumulate a trusted status (based on, at minimum, a
consistent history of non-flagged plugins and, optionally, an out-of-
band identity verification process) — trusted-publisher status affects
only how prominently a plugin is surfaced in marketplace search
(`docs/16-extensibility/plugin-marketplace.md`); it never bypasses
signature, SBOM, hash, or permission review, all of which apply
uniformly regardless of publisher trust level.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `docs/16-extensibility/plugin-marketplace.md` — the distribution and
  discovery mechanism this document secures
- `docs/16-extensibility/plugin-dependencies.md` — the dependency
  relationships checked transitively above
- `docs/16-extensibility/plugin-lifecycle.md` — where a flagged
  vulnerability is surfaced, mirroring deprecation handling
