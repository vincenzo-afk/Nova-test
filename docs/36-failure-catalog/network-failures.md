# Network Failures

## Known failure patterns

Partial request timeout distinguishing 'no response' from 'response lost after success'; DNS failure not distinguished from auth failure; retry storm on provider recovery without backoff jitter.

## Cross-reference

No file in `docs/45-code-perfection-failure-modes/` maps to this subsystem specifically (that directory is organized by broader cross-cutting concern, not by this catalog's per-subsystem breakdown) — see `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set covering this area instead.
