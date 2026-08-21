import { describe, expect, it } from "vitest";
import { WorkspaceManager } from "../src/workspace-manager.js";

describe("WorkspaceManager", () => {
  it("enforces one workspace identity and normal Created-to-Active flow", () => {
    const manager = new WorkspaceManager({
      user_id: "user-1",
      workspace_id: "workspace-1",
      now: () => 1000,
    });

    expect(manager.state()).toBe("Created");
    expect(manager.activate()).toMatchObject({ ok: true });
    expect(manager.identity()).toMatchObject({ user_id: "user-1", workspace_id: "workspace-1" });
    expect(manager.createWorkspace("workspace-2")).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });

  it("blocks sync under a bounded lock lease and recovers after expiry", () => {
    let now = 1000;
    const manager = new WorkspaceManager({
      user_id: "user-1",
      workspace_id: "workspace-1",
      now: () => now,
      lockLeaseMs: 5000,
    });
    manager.activate();

    expect(manager.acquireLock("migration")).toMatchObject({
      ok: true,
      value: { state: "Locked" },
    });
    expect(manager.canSync()).toBe(false);
    now = 6001;
    expect(manager.expireLock()).toMatchObject({ ok: true, value: { state: "Recovering" } });
    expect(manager.completeRecovery()).toMatchObject({ ok: true, value: { state: "Active" } });
    expect(manager.canSync()).toBe(true);
  });

  it("requires a lock for consistency-critical recovery and rejects indefinite release mismatch", () => {
    const manager = new WorkspaceManager({ user_id: "user-1", workspace_id: "workspace-1" });
    manager.activate();

    expect(manager.beginRecovery()).toMatchObject({ ok: true, value: { state: "Recovering" } });
    expect(manager.completeRecovery()).toMatchObject({ ok: true, value: { state: "Active" } });
    expect(manager.releaseLock("missing")).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });
});
