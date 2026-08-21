# Pre-Commit Coding Checklist


## Purpose

A fast, mechanical self-check for an AI agent to run against its own
generated code before proposing it, catching the highest-frequency defect
classes in a system like NOVA.

## Checklist

- [ ] **Every `await`/async call site has error handling** — no bare
      `await x()` where `x` can reject without a surrounding try/catch or
      typed Result.
- [ ] **No timestamp created without explicit UTC.** Search for
      `new Date(`, `datetime.now(`, `Date.now(` and confirm each is
      either explicitly UTC or explicitly local-only for display.
- [ ] **No new global mutable state.** If a new module-level `let`/`var`
      or Python module-level mutable was added, justify it against
      `coding-guidelines.md` rule 9 (explicit concurrency) or remove it.
- [ ] **Every new ID generation uses the project's ID scheme**
      (ULID/UUID), never a counter, timestamp, or hash of mutable data.
- [ ] **Every new external input (file, network payload, plugin output,
      LLM output) is validated against a schema before use** — LLM output
      especially, since it is the least trustworthy input in the system
      (see `docs/05-ai/hallucination-prevention.md`).
- [ ] **Every new tool call is permission-checked before, not after,
      execution.**
- [ ] **Every new loop over a collection from an external source has a
      bound** (max iterations / max size) — unbounded loops over
      observer or LLM-provided data are a real DoS/hang vector in a
      long-running background process.
- [ ] **No secret, token, or credential is logged, including in error
      messages** — check every new `log`/`print`/`console` call against `docs/10-security/secrets.md`.
- [ ] **Every new retry has a max-attempts and backoff, never an
      unbounded `while (true)` retry.**
- [ ] **File and network paths are never string-concatenated from user
      or plugin input** without going through the sandboxing/path
      validation described in `docs/10-security/sandboxing.md`.
