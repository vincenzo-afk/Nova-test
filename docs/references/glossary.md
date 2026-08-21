# External Terminology Glossary

## Purpose

Defines general industry and research terminology used throughout this
repository that originates outside NOVA's own architecture — as opposed
to `docs/00-overview/glossary.md`, which defines NOVA-specific
architectural concepts (Planner, Executor, Working Memory, etc.). Use
this glossary for terms borrowed from the wider AI/software industry;
use the overview glossary for NOVA's own vocabulary.

## Scope

Industry-standard terms referenced in `research.md`, `inspirations.md`,
and `comparisons.md`, and elsewhere in this repository where a
non-NOVA-specific technical term appears.

## Terms

**Accessibility API** — an operating system's programmatic interface for
inspecting and interacting with application UI elements, originally built
for assistive technology (screen readers) and repurposed by NOVA for
structured UI automation (`docs/06-tools/accessibility.md`).

**Embedding** — a numeric vector representation of content (typically
text) positioned in a space where similar content is positioned nearby,
used for semantic search (`docs/04-memory/embeddings.md`).

**Fine-tuning** — adjusting a model's own weights using additional
training data, distinct from retrieval-based context assembly. NOVA does
not perform fine-tuning on user data (`docs/05-ai/model-providers.md`,
ADR-0004).

**MCP (Model Context Protocol)** — a standardized protocol for connecting
AI systems to external tools, resources, and prompts, used as one tier in
NOVA's execution priority chain (`docs/06-tools/mcp.md`).

**Prompt injection** — an attack or failure mode where content processed
by a model is crafted to be interpreted as an instruction rather than
data, potentially causing unintended behavior — the subject of NOVA's
content/instruction separation defense
(`docs/05-ai/prompt-system.md`, `docs/10-security/threat-model.md`).

**RPA (Robotic Process Automation)** — a category of software that
automates repetitive tasks, typically by replaying predefined UI
interaction scripts, referenced in `comparisons.md` and `docs/06-tools/vision.md` for its known reliability lessons.

**Vector database** — a database optimized for storing and querying
embeddings by similarity, one of the storage engines in NOVA's hybrid
memory storage (`docs/04-memory/memory-storage.md`).

**Computer-use agent** — a category of AI agent designed to operate a
computer's graphical interface directly (via vision and simulated input),
referenced in `comparisons.md` to contrast with NOVA's execution-priority
chain, which treats this as a last resort rather than a primary
mechanism.

## Related documents

- `docs/00-overview/glossary.md` — NOVA's own architectural vocabulary
- `research.md`, `inspirations.md`, `comparisons.md` — where these terms
  are used in context
