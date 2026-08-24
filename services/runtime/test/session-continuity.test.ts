import { describe, expect, it, vi } from "vitest";
import { SessionContinuityManager, type DeviceCapability } from "../src/session-continuity.js";

describe("SessionContinuityManager", () => {
  it("makes the device sending the next message the active device without release handoffs", () => {
    const manager = new SessionContinuityManager({ now: () => 1000 });
    manager.registerDevice("desktop", ["filesystem"]);
    manager.registerDevice("phone", ["camera"]);

    expect(manager.receiveMessage("session-1", "desktop")).toMatchObject({
      ok: true,
      value: { active_device_id: "desktop" },
    });
    expect(manager.receiveMessage("session-1", "phone")).toMatchObject({
      ok: true,
      value: { active_device_id: "phone" },
    });
  });

  it("treats stale presence as Offline even when the last value was Online", () => {
    let now = 1000;
    const manager = new SessionContinuityManager({ now: () => now, heartbeatIntervalMs: 5000 });
    manager.registerDevice("phone", ["camera"]);
    manager.heartbeat("phone", "Online");
    now = 7000;

    expect(manager.presence("phone")).toBe("Offline");
  });

  it("lists current presence and capabilities with stale devices marked Offline", () => {
    let now = 1000;
    const manager = new SessionContinuityManager({ now: () => now, heartbeatIntervalMs: 5000 });
    manager.registerDevice("phone", [
      { capability_id: "camera", status: "Supported" },
      { capability_id: "microphone", status: "Permission denied" },
    ]);
    manager.heartbeat("phone", "Busy");
    manager.registerDevice("desktop", ["filesystem"]);
    now = 7000;

    expect(manager.listDevices()).toEqual([
      {
        device_id: "phone",
        presence: "Offline",
        capabilities: [
          { capability_id: "camera", status: "Supported" },
          { capability_id: "microphone", status: "Permission denied" },
        ],
      },
      {
        device_id: "desktop",
        presence: "Offline",
        capabilities: [{ capability_id: "filesystem", status: "Supported" }],
      },
    ]);
  });

  it("distinguishes supported, not-supported, and permission-denied capabilities", () => {
    const manager = new SessionContinuityManager({ now: () => 1000 });
    const capabilities: DeviceCapability[] = [
      { capability_id: "camera", status: "Supported" },
      { capability_id: "microphone", status: "Permission denied" },
    ];
    manager.registerDevice("phone", capabilities);

    expect(manager.negotiate("phone", "camera")).toMatchObject({
      ok: true,
      value: { status: "Supported" },
    });
    expect(manager.negotiate("phone", "gps")).toMatchObject({
      ok: true,
      value: { status: "Not supported" },
    });
    expect(manager.negotiate("phone", "microphone")).toMatchObject({
      ok: true,
      value: { status: "Permission denied" },
    });
  });

  it("revalidates capability immediately before remote execution", async () => {
    const execute = vi.fn(async () => "captured-image");
    const manager = new SessionContinuityManager({ now: () => 1000 });
    manager.registerDevice("phone", [{ capability_id: "camera", status: "Supported" }]);

    manager.updateCapability("phone", { capability_id: "camera", status: "Permission denied" });
    expect(await manager.remoteExecute("phone", "camera", execute)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(execute).not.toHaveBeenCalled();

    manager.updateCapability("phone", { capability_id: "camera", status: "Supported" });
    expect(await manager.remoteExecute("phone", "camera", execute)).toMatchObject({
      ok: true,
      value: "captured-image",
    });
  });
});
