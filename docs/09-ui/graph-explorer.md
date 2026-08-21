# Graph Explorer

## Purpose

A visual interface for browsing the Knowledge Graph's entities and
relationships directly, surfacing connections a user may have forgotten
existed — the visual counterpart to the query-based access described in
`docs/04-memory/knowledge-graph.md`.

## Scope

Graph Explorer-specific visualization and navigation. The underlying
graph structure is `docs/04-memory/knowledge-graph.md` and `docs/04-memory/ontology.md`.

## Visualization model

Nodes rendered by type (per `docs/04-memory/ontology.md`'s fixed node
types: Project, File, Application, Task, Decision, Tool, Conversation,
User), with edges rendered by type and, where meaningful, weighted by
relationship strength — a generic `related_to` edge with low confidence
renders visually distinct from a specific, high-confidence edge like
`belongs_to`.

## Navigation

Starting from a selected node (e.g., the current active project, sourced
from the World Model, `docs/03-runtime/world-model.md`), the user can
expand outward hop by hop, matching the multi-hop traversal query
patterns described in `docs/04-memory/knowledge-graph.md`, rendered
incrementally rather than the entire graph being displayed at once (which
would be both unreadable and unnecessary for most inspection needs).

## Relationship discovery use case

The specific use case this surface exists to serve —
"how are project X and project Y related" — is presented as a
shortest-path highlight between two selected nodes, directly visualizing
the query pattern described in `docs/04-memory/knowledge-graph.md` rather
than requiring the user to construct that query themselves.

## Manual merge/split entry point

Per `docs/04-memory/entity-resolution.md`'s manual merge and split
capability, the Graph Explorer is where a user or maintainer identifies
and corrects a duplicate or incorrectly merged entity, since visual
inspection of the graph is typically how such issues are actually
noticed in practice.

## Ontology-proposal visibility

Pending ontology extension proposals (`docs/04-memory/ontology.md`'s
review queue for new node/edge types) are visible in this surface for
review, rather than existing only as an internal log invisible to the
user or maintainer responsible for approving them.

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `docs/04-memory/knowledge-graph.md` — the structure being visualized
- `docs/04-memory/ontology.md` — the node/edge types and the extension
  review queue
- `docs/04-memory/entity-resolution.md` — the manual merge/split
  capability surfaced here
