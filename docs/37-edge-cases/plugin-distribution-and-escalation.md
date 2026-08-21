# Plugin Distribution / Permission Escalation Attempt — Edge Case

## Scenario

A plugin obtained from an untrusted or unverified distribution channel
(sideloaded, not from the vetted marketplace path,
`docs/16-extensibility/plugin-lifecycle.md`) requests capabilities at
install time that exceed what its manifest declared at discovery, or
attempts to request additional capabilities after installation
(`docs/10-security/permission-escalation.md`). Neither is granted
silently: an unverified distribution source is flagged to the user
before install, not after; and any post-install capability request is
treated as a new, separate approval event — never inherited from the
original install consent, per the "never escalate its own permissions
at runtime" constraint
(`docs/00-implementation-governance/forbidden-decisions.md`).

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
