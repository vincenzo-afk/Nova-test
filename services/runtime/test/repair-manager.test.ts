import { describe, expect, it, vi } from "vitest";
import { RepairManager, type RepairIssue, type RepairOperations } from "../src/repair-manager.js";

describe("RepairManager", () => {
  it("reports safe and ambiguous issues without mutating state in dry-run mode", async () => {
    const operations: RepairOperations = {
      inspect: vi.fn(
        async () =>
          [
            { issue_id: "missing-folder", kind: "missing-folder", safe: true },
            { issue_id: "memory-conflict", kind: "ambiguous-memory-conflict", safe: false },
          ] satisfies readonly RepairIssue[],
      ),
      fix: vi.fn(async () => undefined),
    };
    const manager = new RepairManager(operations);

    const result = await manager.repair({ apply: false });

    expect(result).toMatchObject({
      ok: true,
      value: {
        applied: [],
        reported: [{ issue_id: "missing-folder" }, { issue_id: "memory-conflict" }],
      },
    });
    expect(operations.fix).not.toHaveBeenCalled();
  });

  it("applies only unambiguous safe fixes when explicitly requested", async () => {
    const operations: RepairOperations = {
      inspect: vi.fn(async () => [
        { issue_id: "cache", kind: "corrupt-cache", safe: true },
        { issue_id: "permissions", kind: "wrong-permissions", safe: true },
        { issue_id: "conflict", kind: "ambiguous-memory-conflict", safe: false },
      ]),
      fix: vi.fn(async (issueId) => issueId),
    };
    const manager = new RepairManager(operations);

    expect(await manager.repair({ apply: true })).toMatchObject({
      ok: true,
      value: { applied: ["cache", "permissions"], reported: [{ issue_id: "conflict" }] },
    });
    expect(operations.fix).toHaveBeenCalledTimes(2);
  });
});
