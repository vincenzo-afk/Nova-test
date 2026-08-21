import { describe, expect, it, vi } from "vitest";
import { RestoreManager, type RestoreSource, type LiveStateStore } from "../src/restore-manager.js";

describe("RestoreManager", () => {
  it("restores into an isolated staging state before explicit swap", async () => {
    const source: RestoreSource = { load: vi.fn(async () => ({ value: "restored" })) };
    const live: LiveStateStore = {
      read: vi.fn(async () => ({ value: "live" })),
      swap: vi.fn(async () => undefined),
    };
    const manager = new RestoreManager(source, live);

    const prepared = await manager.prepare("snapshot-1");

    expect(prepared).toMatchObject({
      ok: true,
      value: { verified: true, staging: { value: "restored" } },
    });
    expect(live.swap).not.toHaveBeenCalled();
    expect(
      await manager.apply(prepared.ok ? prepared.value : { verified: false, staging: {} }, false),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(
      await manager.apply(prepared.ok ? prepared.value : { verified: false, staging: {} }, true),
    ).toMatchObject({ ok: true });
    expect(live.swap).toHaveBeenCalledWith({ value: "restored" });
  });

  it("does not touch live state if staging load or verification fails", async () => {
    const source: RestoreSource = {
      load: vi.fn(async () => {
        throw new Error("corrupt");
      }),
    };
    const live: LiveStateStore = {
      read: vi.fn(async () => ({ value: "live" })),
      swap: vi.fn(async () => undefined),
    };
    const manager = new RestoreManager(source, live);

    expect(await manager.prepare("snapshot-corrupt")).toMatchObject({
      ok: false,
      error: { code: "NOVA-EVT002" },
    });
    expect(live.swap).not.toHaveBeenCalled();
  });
});
