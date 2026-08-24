import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGrantStore } from "../../runtime/src/permission-grant-store.js";
import { InMemoryCommunicationBus, MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  MouseObserver,
  NativeMouseEventBridge,
  type NativeMouseEvent,
  type NativeMousePosition,
} from "../src/mouse-observer.js";

const activityEvent = (overrides: Partial<NativeMouseEvent> = {}): NativeMouseEvent => ({
  type: "activity",
  state: "active",
  idle_ms: 0,
  ...overrides,
});

const position: NativeMousePosition = { x: 640, y: 360, screen_width: 1920, screen_height: 1080 };

const permissions = (granted = true) =>
  new PermissionGrantStore({ initial: [{ source: "mouse_activity", granted }] });

describe("MouseObserver", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("does not start or read the cursor before mouse activity permission is granted", async () => {
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      readPosition: vi.fn(async () => position),
    };
    const observer = new MouseObserver({
      permissions: permissions(false),
      bridge,
      bus: new InMemoryCommunicationBus(),
    });

    await expect(observer.enable()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    await expect(observer.readCurrentPosition()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.start).not.toHaveBeenCalled();
    expect(bridge.readPosition).not.toHaveBeenCalled();
  });

  it("publishes activity metadata without movement or click history", async () => {
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      readPosition: vi.fn(async () => position),
    };
    const bus = new InMemoryCommunicationBus();
    const events: unknown[] = [];
    bus.subscribe("observer.mouse.activity", async (message) => events.push(message));
    const observer = new MouseObserver({ permissions: permissions(), bridge, bus });

    await observer.enable();
    await observer.capture(activityEvent({ state: "idle", idle_ms: 120_000 }));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      topic: "observer.mouse.activity",
      payload: { state: "idle", idle_ms: 120_000 },
    });
    expect(JSON.stringify((events[0] as { readonly payload?: unknown }).payload)).not.toMatch(
      /x|y|click|position|movement/i,
    );
  });

  it("reads the current cursor position only on demand and does not publish it as an event", async () => {
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      readPosition: vi.fn(async () => position),
    };
    const observer = new MouseObserver({
      permissions: permissions(),
      bridge,
      bus: new InMemoryCommunicationBus(),
    });
    await observer.enable();

    await expect(observer.readCurrentPosition()).resolves.toEqual({ ok: true, value: position });
    expect(bridge.readPosition).toHaveBeenCalledOnce();
  });

  it("rejects invalid native activity and position data", async () => {
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      readPosition: vi.fn(async () => ({ x: -1, y: 2, screen_width: 1920, screen_height: 1080 })),
    };
    const observer = new MouseObserver({
      permissions: permissions(),
      bridge,
      bus: new InMemoryCommunicationBus(),
    });
    await observer.enable();

    await expect(
      observer.capture({ type: "activity", state: "active", idle_ms: 0, x: 4 } as never),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    await expect(observer.readCurrentPosition()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });

  it("stops the bridge and rejects activity and position reads after revocation", async () => {
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      readPosition: vi.fn(async () => position),
    };
    const observer = new MouseObserver({
      permissions: permissions(),
      bridge,
      bus: new InMemoryCommunicationBus(),
    });
    await observer.enable();

    await expect(observer.revoke()).resolves.toMatchObject({ ok: true, value: "Disabled" });
    await expect(observer.capture(activityEvent())).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    await expect(observer.readCurrentPosition()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.stop).toHaveBeenCalledOnce();
  });

  it("records detailed privacy-safe lifecycle evidence without cursor coordinates or movement history", async () => {
    const sink = new MemoryLogSink();
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      readPosition: vi.fn(async () => position),
    };
    const observer = new MouseObserver({
      permissions: permissions(),
      bridge,
      bus: new InMemoryCommunicationBus(),
      logger: new StructuredLogger({ service: "observer.mouse", sink, minimumLevel: "debug" }),
    });

    await observer.enable();
    await observer.capture(activityEvent());
    await observer.readCurrentPosition();
    await observer.revoke();

    expect(sink.records().map((record) => record.event)).toEqual([
      "mouse.observer.enabled",
      "mouse.event.activity",
      "mouse.position.read",
      "mouse.observer.revoked",
    ]);
    const positionLog = sink.records().find((record) => record.event === "mouse.position.read");
    expect(positionLog?.details).toMatchObject({ screen_width: 1920, screen_height: 1080 });
    expect(JSON.stringify(sink.records())).not.toMatch(/click|movement|position_x|position_y/i);
  });

  it("uses idle and on-demand cursor APIs, not a continuous movement or click-history API", () => {
    const activityScript = NativeMouseEventBridge.nativePowerShellScript();
    const positionScript = NativeMouseEventBridge.nativePositionPowerShellScript();

    expect(activityScript).toContain("GetLastInputInfo");
    expect(activityScript).not.toMatch(/GetCursorPos|GetAsyncKeyState|mouse_event|SendInput/i);
    expect(positionScript).toContain("GetCursorPos");
    expect(positionScript).not.toMatch(/GetAsyncKeyState|mouse_event|SendInput/i);
  });
});
