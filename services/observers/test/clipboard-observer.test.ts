import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGrantStore } from "../../runtime/src/permission-grant-store.js";
import { InMemoryCommunicationBus } from "@nova/shared";
import {
  ClipboardObserver,
  NativeClipboardEventBridge,
  type NativeClipboardEvent,
} from "../src/clipboard-observer.js";

const clipboardEvent = (overrides: Partial<NativeClipboardEvent> = {}): NativeClipboardEvent => ({
  type: "changed",
  content_type: "text",
  content: "private copied text",
  source_application: "Notepad",
  sensitive_source: false,
  correlation_id: "00000000-0000-4000-8000-000000000001",
  ...overrides,
});

const permissions = (metadata = true, content = false) =>
  new PermissionGrantStore({
    initial: [
      { source: "clipboard_metadata", granted: metadata },
      { source: "clipboard_content", granted: content },
    ],
  });

describe("ClipboardObserver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not start or capture before metadata permission is granted", async () => {
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new ClipboardObserver({
      permissions: permissions(false),
      bridge,
      bus: new InMemoryCommunicationBus(),
    });

    await expect(observer.enable()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.start).not.toHaveBeenCalled();
    await expect(observer.capture(clipboardEvent())).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });

  it("publishes metadata only when content permission is absent", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.clipboard.changed", async (message) => {
      received.push(message);
    });
    const observer = new ClipboardObserver({
      permissions: permissions(true, false),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
      now: () => "2026-08-23T00:00:00.000Z",
    });

    await expect(observer.enable()).resolves.toMatchObject({ ok: true, value: "Active" });
    await expect(observer.capture(clipboardEvent())).resolves.toMatchObject({ ok: true });
    await expect(observer.flush()).resolves.toMatchObject({ ok: true });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      topic: "observer.clipboard.changed",
      timestamp: "2026-08-23T00:00:00.000Z",
      source_service: "observer.clipboard",
      correlation_id: "00000000-0000-4000-8000-000000000001",
      payload: {
        entity_ref: "clipboard",
        content_type: "text",
        source_application: "Notepad",
        capture_level: "metadata",
        content_bytes: 19,
      },
    });
    expect(JSON.stringify(received[0])).not.toContain("private copied text");
  });

  it("captures ordinary text only with explicit content permission", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.clipboard.changed", async (message) => {
      received.push(message);
    });
    const observer = new ClipboardObserver({
      permissions: permissions(true, true),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
    });

    await observer.enable();
    await observer.capture(clipboardEvent());
    await observer.flush();

    expect(received[0]).toMatchObject({
      payload: {
        capture_level: "content",
        content: "private copied text",
        content_bytes: 19,
      },
    });
  });

  it("never captures content from a sensitive source even when content permission is granted", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.clipboard.changed", async (message) => {
      received.push(message);
    });
    const observer = new ClipboardObserver({
      permissions: permissions(true, true),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
    });

    await observer.enable();
    await observer.capture(
      clipboardEvent({
        content: "password=secret",
        source_application: "Password Manager",
        sensitive_source: true,
      }),
    );
    await observer.flush();

    expect(received[0]).toMatchObject({
      payload: {
        capture_level: "metadata",
        excluded_reason: "sensitive_source",
      },
    });
    expect(JSON.stringify(received[0])).not.toContain("password=secret");
  });

  it("stops the native source and purges pending content immediately on revocation", async () => {
    const permissionsStore = permissions(true, true);
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.clipboard.changed", async (message) => {
      received.push(message);
    });
    const observer = new ClipboardObserver({ permissions: permissionsStore, bridge, bus });

    await observer.enable();
    await observer.capture(clipboardEvent());
    permissionsStore.update("clipboard_metadata", false);
    await expect(
      observer.capture(clipboardEvent({ content: "after revoke" })),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(observer.state()).toBe("Disabled");
    expect(bridge.stop).toHaveBeenCalledOnce();
    await observer.flush();
    expect(received).toHaveLength(0);
  });

  it("uses an event-driven Windows clipboard listener rather than polling", () => {
    const source = NativeClipboardEventBridge.nativePowerShellScript();
    expect(source).toContain("AddClipboardFormatListener");
    expect(source).toContain("WM_CLIPBOARDUPDATE");
    expect(source).not.toContain("Get-Clipboard");
  });
});
