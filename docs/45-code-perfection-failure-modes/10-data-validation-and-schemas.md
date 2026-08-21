# Landmines: Data Validation & Schemas


## Where this breaks

1. **Trusting LLM output as structurally valid without schema
   validation.** Even with a "JSON mode" or function-calling schema
   requested, model output must be validated against the schema before
   use — models produce malformed or partially-correct structured output
   more often than most agents assume.
2. **Schema validation implemented at the API boundary only, not at
   internal service boundaries.** Internal service-to-service calls
   (e.g. Planner to Executor) need the same validation discipline as
   external API calls — internal doesn't mean trusted.
3. **Optional fields treated as always-present downstream** — a field
   marked optional in `docs/08-api/schemas.md` but accessed with no null check
   three layers down will eventually null-pointer/undefined-access when
   the field is genuinely absent.
4. **Schema version bumped without a migration path for existing stored
   data** — old records written under schema v1 must still be readable
   (via migration or versioned deserialization) after a v2 schema ships.
5. **Enum-like string fields not validated against the actual allowed
   set**, letting a typo'd status string silently create a new,
   unrecognized state that no state-transition logic handles.
6. **Numeric fields not range/sanity-checked** (negative durations,
   timestamps in the far future/past, confidence scores outside [0,1]) —
   these must fail validation, not propagate and corrupt ranking or
   scheduling logic downstream.
