import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGrantStore } from "../../runtime/src/permission-grant-store.js";
import { InMemoryCommunicationBus, MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  KeyboardObserver,
  type KeyboardHotkeyRegistration,
  type NativeKeyboardEvent,
  NativeKeyboardEventBridge,
} from "../src/keyboard-observer.js";

const activityEvent = (overrides: Partial<NativeKeyboardEvent> = {}): NativeKeyboardEvent => ({
  type: "activity",
  state: "active",
  idle_ms: 0,
  ...overrides,
});

const hotkey = (id = "command_palette"): KeyboardHotkeyRegistration => ({
  id,
  modifiers: ["Control", "Shift"],
  key: "Space",
});

const permissions = (granted = true) =>
  new PermissionGrantStore({ initial: [{ source: "keyboard_activity", granted }] });

describe("KeyboardObserver", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("does not start or publish before keyboard activity permission is granted", async () => {
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new KeyboardObserver({
      permissions: permissions(false),
      bridge,
      bus: new InMemoryCommunicationBus(),
      hotkeys: [hotkey()],
    });

    await expect(observer.enable()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.start).not.toHaveBeenCalled();
  });

  it("publishes only activity metadata and passes explicit hotkey registrations to the bridge", async () => {
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const bus = new InMemoryCommunicationBus();
    const events: unknown[] = [];
    bus.subscribe("observer.keyboard.activity", async (message) => events.push(message));
    const observer = new KeyboardObserver({
      permissions: permissions(),
      bridge,
      bus,
      hotkeys: [hotkey()],
    });

    await observer.enable();
    await observer.capture(activityEvent({ state: "idle", idle_ms: 90_000 }));

    expect(bridge.start).toHaveBeenCalledWith(expect.any(Function), [hotkey()], 120_000);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      topic: "observer.keyboard.activity",
      payload: { state: "idle", idle_ms: 90_000 },
    });
    expect(JSON.stringify((events[0] as { readonly payload?: unknown }).payload)).not.toMatch(
      /key|keystroke|text|content/i,
    );
  });

  it("publishes registered hotkey identity but rejects unknown hotkeys without reading key content", async () => {
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const bus = new InMemoryCommunicationBus();
    const events: unknown[] = [];
    bus.subscribe("observer.keyboard.hotkey_triggered", async (message) => events.push(message));
    const observer = new KeyboardObserver({
      permissions: permissions(),
      bridge,
      bus,
      hotkeys: [hotkey()],
    });
    await observer.enable();

    await expect(
      observer.capture({ type: "hotkey_triggered", hotkey_id: "command_palette" }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      observer.capture({ type: "hotkey_triggered", hotkey_id: "unregistered", key: "A" } as never),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      topic: "observer.keyboard.hotkey_triggered",
      payload: { hotkey_id: "command_palette" },
    });
    expect(JSON.stringify(events[0])).not.toContain("A");
  });

  it("stops the bridge and rejects captures immediately after revocation", async () => {
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new KeyboardObserver({
      permissions: permissions(),
      bridge,
      bus: new InMemoryCommunicationBus(),
      hotkeys: [],
    });
    await observer.enable();

    await expect(observer.revoke()).resolves.toMatchObject({ ok: true, value: "Disabled" });
    await expect(observer.capture(activityEvent())).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.stop).toHaveBeenCalledOnce();
  });

  it("rejects unsupported hotkey configuration before native startup", async () => {
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new KeyboardObserver({
      permissions: permissions(),
      bridge,
      bus: new InMemoryCommunicationBus(),
      hotkeys: [{ id: "unsafe", modifiers: ["Control", "Control"], key: "Delete" }],
    });

    await expect(observer.enable()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(bridge.start).not.toHaveBeenCalled();
  });

  it("uses only idle and registered-hotkey APIs in the Windows bridge", () => {
    const script = NativeKeyboardEventBridge.nativePowerShellScript();

    expect(script).toContain("GetLastInputInfo");
    expect(script).toContain("RegisterHotKey");
    expect(script).toContain("0x0312");
    expect(script).not.toMatch(/GetAsyncKeyState|GetKeyboardState|ToUnicode|ReadKey/i);
  });

  it("records detailed activity lifecycle evidence without logging key data", async () => {
    const sink = new MemoryLogSink();
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new KeyboardObserver({
      permissions: permissions(),
      bridge,
      bus: new InMemoryCommunicationBus(),
      hotkeys: [hotkey()],
      logger: new StructuredLogger({ service: "observer.keyboard", sink, minimumLevel: "debug" }),
    });

    await observer.enable();
    await observer.capture(activityEvent({ state: "active", idle_ms: 0 }));
    await observer.capture({ type: "hotkey_triggered", hotkey_id: "command_palette" });
    await observer.revoke();

    expect(sink.records().map((record) => record.event)).toEqual([
      "keyboard.observer.enabled",
      "keyboard.event.activity",
      "keyboard.event.hotkey_triggered",
      "keyboard.observer.revoked",
    ]);
    expect(JSON.stringify(sink.records())).not.toMatch(/Space|Control|Shift|keystroke/i);
  });
});
