import { describe, expect, it, vi } from "vitest";
import { PermissionGrantStore } from "../../runtime/src/permission-grant-store.js";
import { InMemoryCommunicationBus } from "@nova/shared";
import {
  NativeWindowsEventBridge,
  WindowsApplicationObserver,
  type NativeDesktopEvent,
} from "../src/windows-application-observer.js";

const event = (overrides: Partial<NativeDesktopEvent> = {}): NativeDesktopEvent => ({
  type: "window.focused",
  window: {
    window_id: "hwnd:42",
    process_id: 100,
    application_name: "Editor",
    title: "Notes.txt",
    monitor_id: "\\\\.\\DISPLAY1",
    virtual_desktop_id: "desktop-1",
    z_order: 0,
  },
  ...overrides,
});

describe("WindowsApplicationObserver", () => {
  it("does not enable or capture before both application and window permissions are granted", async () => {
    const permissions = new PermissionGrantStore({
      initial: [
        { source: "applications", granted: false },
        { source: "windows", granted: false },
      ],
    });
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new WindowsApplicationObserver({
      permissions,
      bridge,
      bus: new InMemoryCommunicationBus(),
    });

    await expect(observer.enable()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.start).not.toHaveBeenCalled();
    await expect(observer.capture(event())).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });

  it("normalizes application and window events with bounded title-only payloads", async () => {
    const permissions = new PermissionGrantStore({
      initial: [
        { source: "applications", granted: true },
        { source: "windows", granted: true },
      ],
    });
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    bus.subscribe("observer.window.focused", async (message) => {
      received.push(message);
    });
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new WindowsApplicationObserver({
      permissions,
      bridge,
      bus,
      now: () => "2026-08-23T00:00:00.000Z",
      maxTitleLength: 80,
    });

    await expect(observer.enable()).resolves.toMatchObject({ ok: true, value: "Active" });
    await expect(
      observer.capture(event({ window: { ...event().window, title: "A".repeat(200) } })),
    ).resolves.toMatchObject({ ok: true });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      topic: "observer.window.focused",
      timestamp: "2026-08-23T00:00:00.000Z",
      source_service: "observer.windows",
      payload: {
        window_id: "hwnd:42",
        process_id: 100,
        application_name: "Editor",
        title: "A".repeat(80),
        monitor_id: "\\\\.\\DISPLAY1",
        virtual_desktop_id: "desktop-1",
        z_order: 0,
      },
    });
    expect(JSON.stringify(received[0])).not.toContain("Notes.txt");
  });

  it("stops the native bridge and purges events immediately when permission is revoked", async () => {
    const permissions = new PermissionGrantStore({
      initial: [
        { source: "applications", granted: true },
        { source: "windows", granted: true },
      ],
    });
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new WindowsApplicationObserver({
      permissions,
      bridge,
      bus: new InMemoryCommunicationBus(),
    });

    await observer.enable();
    permissions.update("windows", false);
    await expect(observer.capture(event())).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(observer.state()).toBe("Disabled");
    expect(bridge.stop).toHaveBeenCalledOnce();
  });

  it("uses native event hooks and process notifications rather than polling on Windows", () => {
    const source = NativeWindowsEventBridge.nativePowerShellScript();
    expect(source).toContain("SetWinEventHook");
    expect(source).toContain("Win32_ProcessStartTrace");
    expect(source).toContain("Win32_ProcessStopTrace");
    expect(source).toContain("IVirtualDesktopManager");
    expect(source).not.toContain("Get-Process | Where-Object");
  });
});
