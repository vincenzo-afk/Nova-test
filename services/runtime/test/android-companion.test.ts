import { describe, expect, it } from "vitest";
import { AndroidCompanionManager, type CompanionCapability } from "../src/android-companion.js";

describe("AndroidCompanionManager", () => {
  it("requests and revokes permissions individually without bundled grants", () => {
    const manager = new AndroidCompanionManager("android-1", [
      "camera",
      "notifications",
      "microphone",
    ]);

    expect(manager.grant("camera")).toMatchObject({ ok: true });
    expect(manager.permission("camera")).toBe("Granted");
    expect(manager.permission("notifications")).toBe("Revoked");
    expect(manager.revoke("camera")).toMatchObject({ ok: true });
    expect(manager.permission("camera")).toBe("Revoked");
  });

  it("degrades only the dependent capability and requires foreground service for background capture", () => {
    const manager = new AndroidCompanionManager("android-1", ["microphone"]);
    const voice: CompanionCapability = {
      capability_id: "voice",
      required_permissions: ["microphone"],
    };

    expect(manager.use(voice)).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    manager.grant("microphone");
    expect(manager.use(voice)).toMatchObject({ ok: true, value: { status: "Available" } });
    expect(manager.startBackground("voice")).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    manager.startForegroundService();
    expect(manager.startBackground("voice")).toMatchObject({ ok: true });
  });

  it("rejects capabilities not advertised by the companion device", () => {
    const manager = new AndroidCompanionManager("android-1", ["camera"]);

    expect(manager.grant("gps")).toMatchObject({ ok: false, error: { code: "NOVA-AI002" } });
  });
});
