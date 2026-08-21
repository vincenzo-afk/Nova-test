# Feature Flags

Every feature ships behind a flag until it has passed the full test suite in `12-testing/` and had at least one chaos test (`chaos-tests.md`) run against its failure paths. Flags are three-state: off / internal / general — never a direct off-to-general jump. Flag state changes are themselves audit-logged per `docs/10-security/audit.md`.

These three states are the product-facing names for three of the five levels in `docs/14-development/feature-flags.md`'s canonical maturity lifecycle, not a separate mechanism: `off` = `Experimental` (off by default, opt-in only), `internal` = `Beta` (on by default for the opted-in beta channel), `general` = `Stable` (on by default for everyone). `Deprecated` and `Removed` complete that lifecycle beyond `general` and are described there, not here.
