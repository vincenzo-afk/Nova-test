import { describe, expect, it } from "vitest";
import { validateWorkflowDraft } from "../src/main/workflow-draft.js";

const validDraft = {
  workflow_id: "daily-review",
  start_node_id: "start",
  nodes: [
    { id: "start", type: "task" },
    { id: "finish", type: "end" },
  ],
  edges: [{ from: "start", to: "finish" }],
};

describe("validateWorkflowDraft", () => {
  it("accepts a valid acyclic draft and returns the node summary", () => {
    const result = validateWorkflowDraft(validDraft);

    expect(result).toEqual({
      valid: true,
      workflow_id: "daily-review",
      node_count: 2,
      edge_count: 1,
    });
  });

  it("returns a typed validation error for duplicate node identifiers", () => {
    const result = validateWorkflowDraft({
      ...validDraft,
      nodes: [
        { id: "start", type: "task" },
        { id: "start", type: "end" },
      ],
    });

    expect(result).toMatchObject({ valid: false, code: "NOVA-WFL001" });
  });

  it("returns a typed validation error for cyclic edges", () => {
    const result = validateWorkflowDraft({
      ...validDraft,
      edges: [
        { from: "start", to: "finish" },
        { from: "finish", to: "start" },
      ],
    });

    expect(result).toMatchObject({ valid: false, code: "NOVA-WFL001" });
  });
});
