import { describe, expect, it } from "vitest";
import { ContextBuilder } from "../src/context-builder.js";
import { RetrievalFusion } from "../src/retrieval-fusion.js";
import { MemoryVersioning } from "../../memory/src/memory-versioning.js";
import type { RetrievalCandidate } from "../src/knowledge-graph.js";

const candidate = (overrides: Partial<RetrievalCandidate> = {}): RetrievalCandidate => ({
  id: "memory-1",
  content: "A grounded memory",
  semantic_score: 0.9,
  keyword_score: 0.6,
  graph_score: 0.4,
  temporal_score: 0.3,
  entity_score: 0.2,
  importance: 0.5,
  recency: 0.5,
  confidence: 0.8,
  relationship_distance: 1,
  usage_frequency: 0.2,
  pinned: false,
  project_relevance: 0.7,
  inactive: false,
  ...overrides,
});

describe("ContextBuilder", () => {
  it("keeps protected instructions, filters inactive/sensitive items, and stays within budget", () => {
    const result = new ContextBuilder().build({
      original_request: "Summarize this project",
      response_format_instructions: "Use two concise paragraphs",
      purpose: "project",
      token_budget: 30,
      candidates: [
        { ...candidate({ id: "high", content: "Relevant project context", score: 0.9 }) },
        { ...candidate({ id: "inactive", inactive: true, score: 1 }) },
        { ...candidate({ id: "private", sensitive_category: "personal", score: 1 }) },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      value: { original_request: "Summarize this project" },
    });
    if (!result.ok) return;
    expect(result.value.items.map((item) => item.id)).toEqual(["high"]);
    expect(result.value.token_estimate).toBeLessThanOrEqual(30);
  });

  it("rejects a budget that cannot hold protected request instructions", () => {
    const result = new ContextBuilder().build({
      original_request: "A very long request that cannot fit",
      response_format_instructions: "A very long format instruction",
      purpose: "project",
      token_budget: 2,
      candidates: [],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-AI002" } });
  });
});

describe("RetrievalFusion", () => {
  it("deduplicates candidates across branches, ignores inactive records, and ranks by fused score", () => {
    const result = new RetrievalFusion().fuse([
      {
        branch: "semantic",
        candidates: [candidate({ id: "shared" }), candidate({ id: "inactive", inactive: true })],
      },
      {
        branch: "keyword",
        candidates: [
          candidate({ id: "shared", keyword_score: 0.9 }),
          candidate({ id: "other", semantic_score: 0.1 }),
        ],
      },
    ]);

    expect(result.map((item) => item.id)).toEqual(["shared", "other"]);
    expect(result[0]?.score).toBeGreaterThan(result[1]?.score ?? 0);
  });
});

describe("MemoryVersioning", () => {
  it("accepts equal and forward schema versions but rejects downgrades", () => {
    expect(MemoryVersioning.isForwardOrEqual("1.2.0", "1.2.0")).toBe(true);
    expect(MemoryVersioning.isForwardOrEqual("1.2.0", "1.3.0")).toBe(true);
    expect(MemoryVersioning.assertForwardOrEqual("2.0.0", "1.9.0")).toMatchObject({
      ok: false,
      error: { code: "NOVA-MEM001" },
    });
  });
});
