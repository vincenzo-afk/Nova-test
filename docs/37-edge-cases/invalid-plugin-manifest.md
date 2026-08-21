# Invalid Plugin Manifest — Edge Case

## Scenario

A plugin fails manifest validation at discovery or install time
(malformed schema, undeclared capability usage, unsupported API
version — `docs/16-extensibility/plugin-lifecycle.md`). NOVA rejects the
install before any sandbox is created, reports the specific validation
failure, and never partially installs a plugin whose manifest didn't
fully validate — this is distinct from `plugin-crash.md`, which covers a
plugin that installed successfully but fails at runtime.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
