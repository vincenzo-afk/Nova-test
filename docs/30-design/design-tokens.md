# Design Tokens

Tokens are defined once (JSON/YAML source of truth) and consumed by all platforms; a token rename or value change is a single-file diff, never a find-and-replace across component files — components must reference tokens, never literals.
