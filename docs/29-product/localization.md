# Localization

String externalization is required from the first implementation of any UI screen — no hardcoded user-facing strings, ever, including error messages. Date/number formatting follows `docs/00-overview/time-semantics.md` for storage (UTC) and locale rules for display only. Initial launch locale: en-US; architecture must not assume single-locale.
