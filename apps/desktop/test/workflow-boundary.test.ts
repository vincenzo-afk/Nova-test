import { describe, expect, it } from "vitest";
import type { WorkflowResult } from "@nova/runtime";
import { projectWorkflowResult } from "../src/main/response-projections.js";

describe("workflow renderer boundary", () => {
  it("projects workflow results without completed node IDs", () => {
    const result: WorkflowResult = {
      workflow_id: "workflow-1",
      state: "Completed",
      completedNodeIds: ["secret-node-1", "secret-node-2"],
      checkpointId: "checkpoint-1",
    };

    const projected = projectWorkflowResult(result);

    expect(projected).toEqual({
      workflow_id: "workflow-1",
      state: "Completed",
      completed_node_count: 2,
      checkpoint_id: "checkpoint-1",
    });
    expect(JSON.stringify(projected)).not.toContain("secret-node-1");
    expect(JSON.stringify(projected)).not.toContain("secret-node-2");
  });
});
