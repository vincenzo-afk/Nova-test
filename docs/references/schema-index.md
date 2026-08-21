# Schema Index

## Purpose

A single index pointing to the authoritative schema definition for every
major entity type, so a reader does not need to already know which of
180+ documents defines a given schema. This document intentionally
contains no schema definitions of its own — every entry links to the
one canonical document, consistent with the principle of avoiding
duplicated explanations across this repository.

## Scope

Index only. Do not add schema field definitions here; add them to the
owning document and add or update the corresponding index row instead.

## Index

| Entity | Canonical schema location |
|---|---|
| User | `docs/10-security/authentication.md` |
| Session | `docs/10-security/authentication.md` |
| Project | `docs/04-memory/ontology.md` |
| File (Knowledge Graph node) | `docs/04-memory/ontology.md` |
| Application (Knowledge Graph node) | `docs/04-memory/ontology.md` |
| Decision (Knowledge Graph node) | `docs/04-memory/ontology.md` |
| Conversation (Knowledge Graph node) | `docs/04-memory/ontology.md` |
| Task | `docs/03-runtime/task-manager.md` (state/lifecycle), `docs/08-api/schemas.md` (wire format) |
| Plan | `docs/03-runtime/planner.md` |
| Capability | `docs/05-ai/capability-registry.md` |
| Tool | `docs/06-tools/tool-interface.md` (contract), `docs/06-tools/tool-schema-versioning.md` (versioning) |
| Plugin | `docs/16-extensibility/plugin-architecture.md` |
| Memory record (general) | `docs/04-memory/memory-types.md` (content), `docs/04-memory/memory-confidence.md` (confidence metadata), `docs/04-memory/memory-lineage.md` (provenance) |
| Event / message envelope | `docs/02-architecture/communication-model.md` |
| Provider configuration | `docs/05-ai/model-providers.md` |
| Prompt template | `docs/05-ai/prompt-system.md` (structure), `docs/05-ai/prompt-versioning.md` (versioning) |

## How to keep this index current

Adding a new major entity type, or relocating an existing schema to a
new document, requires updating this index in the same change — this is
checked as part of `docs/14-development/module-checklist.md`, the same
way a new node/edge type requires updating
`docs/04-memory/ontology.md`'s own table.

## Related documents

- `docs/diagrams/entity-relationship.md` — the relationship-level diagram
  spanning these same entities
- `docs/14-development/naming-conventions.md` — the naming rules these
  schemas follow
- `docs/00-overview/glossary.md`, `docs/references/glossary.md` — term
  definitions, as distinct from this index's schema-location focus
