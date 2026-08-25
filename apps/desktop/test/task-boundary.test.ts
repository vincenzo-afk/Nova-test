import { describe, expect, it } from "vitest";
import type { TaskRecord } from "@nova/runtime";
import { projectTaskRecord } from "../src/main/response-projections.js";

describe("task renderer boundary", () => {
  it("projects task records without prompts, correlation IDs, workflow history, or reasons", () => {
    const record: TaskRecord = {
      task_id: "task-1",
      goal: "private user prompt",
      correlation_id: "correlation-secret",
      owner_device_id: "device-1",
      state: "WaitingUser",
      retry_count: 2,
      step_history: [{ node_id: "completed-node", output: "private output" }],
      waiting_user_reason: "permission_confirmation",
      reason: "private failure context",
      updated_at: "2026-08-26T00:00:00.000Z",
    };

    const projected = projectTaskRecord(record);

    expect(projected).toEqual({
      task_id: "task-1",
      state: "WaitingUser",
      retry_count: 2,
      updated_at: "2026-08-26T00:00:00.000Z",
    });
    expect(JSON.stringify(projected)).not.toContain("private user prompt");
    expect(JSON.stringify(projected)).not.toContain("correlation-secret");
    expect(JSON.stringify(projected)).not.toContain("completed-node");
    expect(JSON.stringify(projected)).not.toContain("private failure context");
  });
});
