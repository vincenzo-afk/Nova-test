# Event Taxonomy

Every event: `{domain}.{action}` (e.g. `chat.message_sent`, `workflow.node_failed`). No event payload includes raw user content, memory text, or credentials — only IDs, counts, durations, and enum-typed fields. Cross-reference `docs/26-system-reference/07-event-catalog.md` for the canonical list; this file governs naming/shape rules only.
