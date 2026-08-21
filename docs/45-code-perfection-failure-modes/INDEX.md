# Code-Perfection Failure Modes — Index


## Purpose

This directory is the most operationally important one for any AI coding
agent working on NOVA. Where `25-failure-modes/` documents *runtime*
failure modes (what happens in production), this directory documents
*code-generation-time* failure modes — the specific, concrete ways
generated code goes subtly wrong even when it compiles, passes a
superficial test, and looks correct on read-through.

Every file below is written as a checklist of landmines for a specific
subsystem. Read the file for the subsystem you're touching **before**
writing code, not after something breaks.

## Files

- `01-memory-and-state.md` - `02-planner-executor-verifier.md` - `03-model-router-and-providers.md` - `04-async-and-concurrency.md` - `05-tool-execution-and-permissions.md` - `06-workflow-engine.md` - `07-plugin-and-sandboxing.md` - `08-multi-device-and-sync.md` - `09-ui-and-state-binding.md` - `10-data-validation-and-schemas.md` - `11-error-handling-and-logging.md` - `12-testing-blind-spots.md`

## How to use this directory as an AI agent

For each ticket, identify the 2-4 subsystems it touches using
`docs/43-ai-development/architecture-index.md`, then read the matching file(s)
here in full. After generating code, re-read the checklist items against
the diff — not from memory, actually re-check each line, since this is
precisely the class of mistake that "feels" avoided but isn't.
