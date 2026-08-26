import { describe, expect, it, vi } from "vitest";
import { UpgradeManager, type UpgradeAdapter } from "../src/upgrade-manager.js";

describe("UpgradeManager", () => {
  it("snapshots before running a contiguous migration chain and verifies success", async () => {
    const calls: string[] = [];
    const adapter: UpgradeAdapter = {
      snapshot: vi.fn(async () => {
        calls.push("snapshot");
        return "snap-1";
      }),
      migrate: vi.fn(async (from, to) => {
        calls.push(`${from}->${to}`);
        return { version: to };
      }),
      updatePlugins: vi.fn(async () => {
        calls.push("plugins");
      }),
      verify: vi.fn(async () => {
        calls.push("verify");
        return true;
      }),
      rollback: vi.fn(async () => {
        calls.push("rollback");
      }),
    };
    const manager = new UpgradeManager(adapter);

    expect(await manager.upgrade({ current_version: 1, target_version: 3 })).toMatchObject({
      ok: true,
      value: { status: "Upgraded", version: 3 },
    });
    expect(calls).toEqual(["snapshot", "1->2", "2->3", "plugins", "verify"]);
  });

  it("pauses in-flight work before migration and resumes it after verification", async () => {
    const calls: string[] = [];
    const adapter: UpgradeAdapter = {
      snapshot: vi.fn(async () => {
        calls.push("snapshot");
        return "snap-pause";
      }),
      pauseInFlight: vi.fn(async () => {
        calls.push("pause");
      }),
      migrate: vi.fn(async (from, to) => {
        calls.push(`${from}->${to}`);
        return { version: to };
      }),
      updatePlugins: vi.fn(async () => {
        calls.push("plugins");
      }),
      verify: vi.fn(async () => {
        calls.push("verify");
        return true;
      }),
      resumeAfterUpgrade: vi.fn(async () => {
        calls.push("resume");
      }),
      rollback: vi.fn(async () => {
        calls.push("rollback");
      }),
    };

    await expect(
      new UpgradeManager(adapter).upgrade({ current_version: 1, target_version: 2 }),
    ).resolves.toMatchObject({
      ok: true,
      value: { status: "Upgraded", version: 2 },
    });
    expect(calls).toEqual(["snapshot", "pause", "1->2", "plugins", "verify", "resume"]);
  });

  it("rejects a partially configured pause/resume lifecycle", async () => {
    const adapter: UpgradeAdapter = {
      snapshot: vi.fn(async () => "snap-mismatch"),
      pauseInFlight: vi.fn(async () => undefined),
      migrate: vi.fn(async (_from, to) => ({ version: to })),
      updatePlugins: vi.fn(async () => undefined),
      verify: vi.fn(async () => true),
      rollback: vi.fn(async () => undefined),
    };

    expect(
      await new UpgradeManager(adapter).upgrade({ current_version: 1, target_version: 2 }),
    ).toMatchObject({
      ok: false,
      error: {
        code: "NOVA-EVT002",
        message: "Upgrade pause and resume hooks must be configured together.",
      },
    });
    expect(adapter.snapshot).not.toHaveBeenCalled();
  });

  it("resumes paused work after rolling back a failed migration", async () => {
    const calls: string[] = [];
    const adapter: UpgradeAdapter = {
      snapshot: vi.fn(async () => {
        calls.push("snapshot");
        return "snap-recovery";
      }),
      pauseInFlight: vi.fn(async () => {
        calls.push("pause");
      }),
      migrate: vi.fn(async () => {
        calls.push("migrate");
        throw new Error("migration failed");
      }),
      updatePlugins: vi.fn(async () => undefined),
      verify: vi.fn(async () => true),
      resumeAfterUpgrade: vi.fn(async () => {
        calls.push("resume");
      }),
      rollback: vi.fn(async () => {
        calls.push("rollback");
      }),
    };

    expect(
      await new UpgradeManager(adapter).upgrade({ current_version: 1, target_version: 2 }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-EVT002" },
    });
    expect(calls).toEqual(["snapshot", "pause", "migrate", "rollback", "resume"]);
  });

  it("rolls back to the pre-upgrade snapshot on migration or verification failure", async () => {
    const adapter: UpgradeAdapter = {
      snapshot: vi.fn(async () => "snap-2"),
      migrate: vi.fn(async () => {
        throw new Error("migration failed");
      }),
      updatePlugins: vi.fn(async () => undefined),
      verify: vi.fn(async () => true),
      rollback: vi.fn(async () => undefined),
    };
    const manager = new UpgradeManager(adapter);

    expect(await manager.upgrade({ current_version: 1, target_version: 2 })).toMatchObject({
      ok: false,
      error: { code: "NOVA-EVT002" },
    });
    expect(adapter.rollback).toHaveBeenCalledWith("snap-2");
  });
});
