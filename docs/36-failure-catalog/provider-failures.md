# Provider Failures

## Known failure patterns

Provider auth expiry mid-session; rate-limit cascading across fallback chain; streaming response dropped mid-token; local model OOM under concurrent requests from multiple observers.

## Cross-reference

See `docs/45-code-perfection-failure-modes/03-model-router-and-providers.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
