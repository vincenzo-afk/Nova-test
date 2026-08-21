import { describe, expect, it } from "vitest";
import { KnowledgeGraph } from "../src/knowledge-graph.js";
import { ContextBuilder } from "../src/context-builder.js";
import { RetrievalFusion } from "../src/retrieval-fusion.js";
import type { GraphNode, RetrievalCandidate } from "../src/knowledge-graph.js";

const project: GraphNode = {
  id: "project-1",
  type: "Project",
  name: "Nova",
  properties: {},
  active: true,
};
const file: GraphNode = {
  id: "file-1",
  type: "File",
  name: "README.md",
  properties: {},
  active: true,
};
const tool: GraphNode = { id: "tool-1", type: "Tool", name: "git", properties: {}, active: true };

describe("KnowledgeGraph", () => {
  it("rejects unknown ontology node types and missing edge endpoints", () => {
    const graph = new KnowledgeGraph();

    expect(graph.addNode({ ...project, type: "Unknown" as GraphNode["type"] })).toMatchObject({
      ok: false,
      error: { code: "NOVA-MEM002" },
    });
    graph.addNode(project);
    expect(
      graph.addEdge({
        id: "edge-1",
        type: "belongs_to",
        from_node_id: "missing",
        to_node_id: project.id,
        weight: 1,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-MEM003" } });
  });

  it("enforces typed edge directions and preserves endpoint consistency", () => {
    const graph = new KnowledgeGraph();
    graph.addNode(project);
    graph.addNode(file);

    expect(
      graph.addEdge({
        id: "edge-1",
        type: "belongs_to",
        from_node_id: file.id,
        to_node_id: project.id,
        weight: 1,
      }),
    ).toMatchObject({ ok: true });
    expect(
      graph.addEdge({
        id: "edge-2",
        type: "belongs_to",
        from_node_id: project.id,
        to_node_id: file.id,
        weight: 1,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-MEM002" } });
  });

  it("rejects a cycle for constrained edge types while allowing inactive nodes to remain queryable explicitly", () => {
    const graph = new KnowledgeGraph();
    graph.addNode(project);
    graph.addNode(file);
    graph.addNode(tool);
    graph.addEdge({
      id: "edge-1",
      type: "related_to",
      from_node_id: project.id,
      to_node_id: file.id,
      weight: 1,
    });
    graph.addEdge({
      id: "edge-2",
      type: "related_to",
      from_node_id: file.id,
      to_node_id: tool.id,
      weight: 1,
    });

    expect(
      graph.addEdge({
        id: "edge-3",
        type: "related_to",
        from_node_id: tool.id,
        to_node_id: project.id,
        weight: 1,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-MEM002" } });
    graph.markInactive(file.id);
    expect(graph.getNode(file.id)).toMatchObject({ ok: true, value: { active: false } });
  });
});

const candidate = (overrides: Partial<RetrievalCandidate> = {}): RetrievalCandidate => ({
  id: "memory-1",
  content: "project decision",
  semantic_score: 0.8,
  keyword_score: 0.5,
  graph_score: 0.4,
  temporal_score: 0.7,
  entity_score: 0.6,
  importance: 0.8,
  recency: 0.8,
  confidence: 0.9,
  relationship_distance: 0,
  usage_frequency: 0.2,
  pinned: false,
  project_relevance: 0.5,
  inactive: false,
  sensitive_category: undefined,
  ...overrides,
});

describe("RetrievalFusion and ContextBuilder", () => {
  it("deduplicates branch hits and ranks fused candidates", () => {
    const fusion = new RetrievalFusion();
    const result = fusion.fuse([
      { branch: "keyword", candidates: [candidate({ keyword_score: 1 })] },
      {
        branch: "semantic",
        candidates: [
          candidate({ semantic_score: 0.9 }),
          candidate({ id: "memory-2", content: "other", semantic_score: 0.7 }),
        ],
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("memory-1");
    expect(result[0]?.score).toBeGreaterThan(result[1]?.score ?? 0);
  });

  it("excludes inactive and sensitive candidates before context assembly", () => {
    const builder = new ContextBuilder();
    const result = builder.build({
      original_request: "summarize project",
      response_format_instructions: "plain text",
      purpose: "general",
      token_budget: 100,
      candidates: [
        { ...candidate({ id: "active", content: "safe context", score: undefined }), score: 0.9 },
        { ...candidate({ id: "inactive", content: "old", inactive: true }), score: 0.99 },
        {
          ...candidate({ id: "financial", content: "salary", sensitive_category: "financial" }),
          score: 1,
        },
      ],
    });

    expect(result).toMatchObject({ ok: true, value: { items: [{ id: "active" }] } });
  });

  it("evicts the lowest-ranked context first and never compresses the request or format instructions", () => {
    const builder = new ContextBuilder();
    const result = builder.build({
      original_request: "request",
      response_format_instructions: "format",
      purpose: "general",
      token_budget: 10,
      candidates: [
        { ...candidate({ id: "high", content: "high value" }), score: 0.95 },
        { ...candidate({ id: "low", content: "low value that should be evicted" }), score: 0.1 },
      ],
    });

    expect(result).toMatchObject({ ok: true, value: { items: [{ id: "high" }] } });
  });

  it("reports a hard budget failure when the protected request and format cannot fit", () => {
    const builder = new ContextBuilder();
    const result = builder.build({
      original_request: "a very long request that cannot fit",
      response_format_instructions: "a very long format contract",
      purpose: "general",
      token_budget: 2,
      candidates: [],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-AI002" } });
  });
});
