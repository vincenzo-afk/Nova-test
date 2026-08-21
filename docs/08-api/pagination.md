# Pagination

## Purpose

Pagination mechanics for every list-returning endpoint in
`endpoint-catalog.md` (tasks, tools, and any future list endpoint) — one
consistent scheme rather than each endpoint inventing its own.

## Scope

Request parameters, response shape, and ordering guarantees for list
endpoints. Does not cover the internal Retrieval Fusion Engine's ranked
result set (`docs/04-memory/retrieval-engine.md`), which is relevance-
ranked, not page-ordered, and uses a different result-shape entirely.

## Cursor-based, not offset-based

List endpoints use an opaque cursor, not a numeric page/offset — an
offset-based scheme silently skips or repeats rows when the underlying
table (`docs/04-memory/table-contracts.md`) is written to between page
requests, which is the normal case for `tasks` (constantly changing
state) and is exactly the kind of silent-data-integrity issue this
repository's discipline treats as unacceptable rather than an edge case
to shrug off.

## Request parameters

- `cursor` (optional) — opaque token from a previous response's
  `next_cursor`; omitted for the first page.
- `limit` (optional, default 50, max 200) — requests exceeding the max
  are clamped, not rejected, consistent with the general "never a
  blank/error result for a basic case" posture established elsewhere
  (`docs/29-product/search.md`).

## Response shape

```json
{
  "items": [ /* the requested resource, per schemas.md */ ],
  "next_cursor": "opaque_token_or_null",
  "has_more": true
}
```

`next_cursor` is `null` and `has_more` is `false` when the caller has
reached the end of the result set — a client never has to infer
end-of-list from an empty `items` array alone.

## Ordering guarantee

Unless an endpoint's own documentation states otherwise, list results
are ordered by creation time, descending (most recent first) — matching
the index strategy already defined for the underlying tables in
`docs/04-memory/indexes.md` (e.g., `tasks`'s `(identity_id, state)`
index is paired with primary-key/creation-time ordering for the
paginated scan itself).

## Related documents

- `endpoint-catalog.md` — which endpoints this pagination scheme applies to
- `docs/08-api/schemas.md` — the `items` array's per-resource shape
- `docs/04-memory/indexes.md` — the indexes this pagination scheme's ordering relies on
