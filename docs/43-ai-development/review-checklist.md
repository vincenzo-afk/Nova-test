# AI-Generated Code Review Checklist


## Purpose

What a reviewer (human or a second AI pass) must specifically verify for
code generated against these docs, beyond generic code review.

## Checklist

1. **Traceability** — does every non-trivial function cite, in a comment
   or PR description, the doc section it implements? Code with no
   traceable spec is either undocumented scope creep or a sign the spec
   needs updating.
2. **Interface fidelity** — does the function signature actually match
   what `architecture-index.md` and the target doc specify, including
   error/Result types, not just the happy-path return type?
3. **Failure mode coverage** — cross-check the PR's handled failure cases
   against the full list in the relevant `25-failure-modes/` and `45-code-perfection-failure-modes/` doc. Flag any failure mode listed
   in docs but not visibly handled in the diff.
4. **No silent scope narrowing** — did the implementation quietly drop a
   documented requirement (e.g., an edge case, a permission check) because
   it was inconvenient, without flagging it in the PR description?
5. **No silent scope expansion** — did the implementation add behavior
   not in any doc? If so, either the doc needs updating first, or the
   code needs trimming — undocumented behavior is untested-by-spec
   behavior.
6. **Consistency with `docs/02-architecture/dependency-map.md`** — if a high fan-in component
   was touched, are all listed consumers verified unaffected or updated?
7. **Test-to-criteria mapping** — does each acceptance criterion in
   `acceptance-criteria.md` format have a corresponding test, not just
   "tests pass"?
8. **No new duplicated logic** — search for whether the behavior being
   added already exists elsewhere (a second date-parsing routine, a
   second retry loop) — NOVA's failure-mode docs exist precisely because
   duplicated ad-hoc logic is where inconsistent error handling creeps in.
9. **No hallucinated imports or APIs** — every import resolves to a real,
   installed package at the version declared in
   `docs/14-development/technology-stack.md`; every method/field called
   on it exists in that package's real API, not a plausible-sounding one
   the model inferred from similar libraries. Verify against the actual
   installed package, not from training-data memory of a similar-looking
   API.
10. **No stubbed functions left as the deliverable** — a function body
    that is `pass`, `// TODO`, `throw new Error("not implemented")`, or
    equivalent is not "complete," regardless of what the PR description
    claims. `docs/00-implementation-governance/definition-of-done.md`
    does not permit partial implementations presented as done.
11. **Single responsibility per function** — a function that both
    fetches and mutates state, or that branches into materially
    different behaviors based on a flag, is a refactor target flagged
    here, not approved as-is, per `coding-guidelines.md`'s Style
    baseline.
12. **Docstring/comment fidelity** — every public function's docstring
    describes what the function *actually does*, not what it was
    originally intended to do before the implementation changed during
    development. A stale docstring is a defect, not a nitpick — it's a
    False documentation claim the next reader (human or AI) will trust.
13. **No hardcoded credentials, paths, or environment assumptions** — no
    literal API key, file path outside the documented storage layout
    (`docs/13-devops/storage-layout.md`), or OS-specific assumption
    (e.g., a bare `/` or `\` path separator) that would break on a
    different platform or a different user's machine. Credentials are
    always referenced via `docs/10-security/secrets.md`'s vault
    pattern, never inlined.
