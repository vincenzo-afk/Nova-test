import { describe, expect, it, vi } from "vitest";
import { MultiAgentCoordinator, type AgentBranch, type AgentEventBus } from "../src/multi-agent.js";

const branch = (id: string, permission: string): AgentBranch => ({
  branch_id: id,
  permission_scope: new Set([permission]),
  run: vi.fn(async () => ({ branch_id: id, status: "completed", result: id })),
});

describe("MultiAgentCoordinator", () => {
  it("runs genuinely independent branches under one parent and merges results", async () => {
    const bus: AgentEventBus = { publish: vi.fn(async () => undefined) };
    const coordinator = new MultiAgentCoordinator(bus);
    const first = branch("research", "read:web");
    const second = branch("refactor", "write:repo");

    const result = await coordinator.run(
      "parent-1",
      [first, second],
      new Set(["read:web", "write:repo"]),
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        parent_task_id: "parent-1",
        status: "completed",
        branches: [{ branch_id: "research" }, { branch_id: "refactor" }],
      },
    });
    expect(bus.publish).toHaveBeenCalled();
  });

  it("never allows a branch to exceed the parent permission scope", async () => {
    const coordinator = new MultiAgentCoordinator({ publish: vi.fn(async () => undefined) });
    const outside = branch("outside", "admin:delete");

    expect(await coordinator.run("parent-2", [outside], new Set(["read:web"]))).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(outside.run).not.toHaveBeenCalled();
  });

  it("reports partial failure while preserving successful branch results", async () => {
    const failing: AgentBranch = {
      ...branch("fail", "read:web"),
      run: vi.fn(async () => ({ branch_id: "fail", status: "failed", result: null })),
    };
    const success = branch("ok", "read:web");
    const coordinator = new MultiAgentCoordinator({ publish: vi.fn(async () => undefined) });

    expect(
      await coordinator.run("parent-3", [failing, success], new Set(["read:web"])),
    ).toMatchObject({
      ok: true,
      value: { status: "partial", branches: [{ status: "failed" }, { status: "completed" }] },
    });
  });
});
