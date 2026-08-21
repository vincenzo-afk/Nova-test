import { describe, expect, it } from "vitest";
import { ContextBuilder } from "../src/context-builder.js";
import { RetrievalFusion } from "../src/retrieval-fusion.js";
import type { RetrievalCandidate } from "../src/knowledge-graph.js";

interface RecordedScenario {
  readonly name: string;
  readonly purpose: string;
  readonly expected_ids: readonly string[];
  readonly candidates: readonly RetrievalCandidate[];
}

const memory = (
  id: string,
  content: string,
  overrides: Partial<RetrievalCandidate> = {},
): RetrievalCandidate => ({
  id,
  content,
  semantic_score: 0.8,
  keyword_score: 0.7,
  graph_score: 0.6,
  temporal_score: 0.5,
  entity_score: 0.4,
  importance: 0.7,
  recency: 0.8,
  confidence: 0.9,
  relationship_distance: 1,
  usage_frequency: 0.4,
  pinned: false,
  project_relevance: 0.8,
  inactive: false,
  ...overrides,
});

const scenarios: readonly RecordedScenario[] = [
  {
    name: "project-summary-with-stale-and-private-context",
    purpose: "project",
    expected_ids: ["project-decision"],
    candidates: [
      memory("project-decision", "The project uses a local-first SQLite memory store."),
      memory("stale-note", "An archived provider experiment.", { inactive: true }),
      memory("private-note", "A personal unrelated note.", { sensitive_category: "personal" }),
    ],
  },
  {
    name: "grounded-task-context",
    purpose: "task",
    expected_ids: ["task-plan", "task-result"],
    candidates: [
      memory("task-plan", "The task requires a permission check before execution."),
      memory("task-result", "The verifier records a ground-truth result."),
    ],
  },
];

describe("Recorded scenario simulation", () => {
  it.each(scenarios)("replays $name against the retrieval and context pipeline", (scenario) => {
    const fused = new RetrievalFusion().fuse([
      { branch: "semantic", candidates: scenario.candidates },
      { branch: "keyword", candidates: scenario.candidates },
    ]);
    const result = new ContextBuilder().build({
      original_request: "Provide a grounded summary",
      response_format_instructions: "Return only supported facts",
      purpose: scenario.purpose,
      token_budget: 200,
      candidates: fused,
    });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.items.map((item) => item.id)).toEqual(scenario.expected_ids);
    expect(result.value.items.every((item) => item.content.length > 0)).toBe(true);
  });
});
