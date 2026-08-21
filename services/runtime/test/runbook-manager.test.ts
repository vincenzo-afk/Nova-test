import { describe, expect, it, vi } from "vitest";
import { RunbookManager, type RunbookOperations } from "../src/runbook-manager.js";

describe("RunbookManager", () => {
  it("recovers startup failure with the last-known-good configuration", async () => {
    const operations: RunbookOperations = {
      restoreLastKnownGoodConfig: vi.fn(async () => true),
      engageProviderFallback: vi.fn(async () => true),
      resumeSyncCheckpoint: vi.fn(async () => true),
      fullResync: vi.fn(async () => true),
      notifyDegraded: vi.fn(async () => undefined),
    };
    const manager = new RunbookManager(operations);

    expect(await manager.handle("startup-failure")).toMatchObject({
      ok: true,
      value: { state: "Resolved", action: "last-known-good-config" },
    });
    expect(operations.restoreLastKnownGoodConfig).toHaveBeenCalledOnce();
  });

  it("engages fallback and escalates when every provider in a domain is down", async () => {
    const operations: RunbookOperations = {
      restoreLastKnownGoodConfig: vi.fn(async () => true),
      engageProviderFallback: vi.fn(async () => false),
      resumeSyncCheckpoint: vi.fn(async () => true),
      fullResync: vi.fn(async () => true),
      notifyDegraded: vi.fn(async () => undefined),
    };
    const manager = new RunbookManager(operations);

    expect(await manager.handle("provider-down")).toMatchObject({
      ok: true,
      value: { state: "Escalated", action: "notify-degraded" },
    });
    expect(operations.notifyDegraded).toHaveBeenCalledOnce();
  });

  it("resumes sync from checkpoint and uses full resync only as last resort", async () => {
    const operations: RunbookOperations = {
      restoreLastKnownGoodConfig: vi.fn(async () => true),
      engageProviderFallback: vi.fn(async () => true),
      resumeSyncCheckpoint: vi.fn(async () => false),
      fullResync: vi.fn(async () => true),
      notifyDegraded: vi.fn(async () => undefined),
    };
    const manager = new RunbookManager(operations);

    expect(await manager.handle("sync-failure")).toMatchObject({
      ok: true,
      value: { state: "Resolved", action: "full-resync" },
    });
    expect(operations.fullResync).toHaveBeenCalledOnce();
  });
});
