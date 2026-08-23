import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGrantStore } from "../../runtime/src/permission-grant-store.js";
import { InMemoryCommunicationBus } from "@nova/shared";
import {
  NativeNotificationEventBridge,
  NotificationObserver,
  type NativeNotificationEvent,
} from "../src/notification-observer.js";

const notificationEvent = (
  overrides: Partial<NativeNotificationEvent> = {},
): NativeNotificationEvent => ({
  type: "received",
  source_application: "Build Runner",
  title: "Build complete",
  body: "Tests passed",
  sensitive_source: false,
  correlation_id: "00000000-0000-4000-8000-000000000001",
  ...overrides,
});

const permissions = (metadata = true, content = false) =>
  new PermissionGrantStore({
    initial: [
      { source: "notifications_metadata", granted: metadata },
      { source: "notifications_content", granted: content },
    ],
  });

describe("NotificationObserver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not start or capture before notification metadata permission is granted", async () => {
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new NotificationObserver({
      permissions: permissions(false),
      bridge,
      bus: new InMemoryCommunicationBus(),
    });

    await expect(observer.enable()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.start).not.toHaveBeenCalled();
    await expect(observer.capture(notificationEvent())).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });

  it("publishes notification metadata without the body when content permission is absent", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.notification.received", async (message) => {
      received.push(message);
    });
    const observer = new NotificationObserver({
      permissions: permissions(true, false),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
      now: () => "2026-08-23T00:00:00.000Z",
    });

    await expect(observer.enable()).resolves.toMatchObject({ ok: true, value: "Active" });
    await expect(observer.capture(notificationEvent())).resolves.toMatchObject({ ok: true });
    await expect(observer.flush()).resolves.toMatchObject({ ok: true });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      topic: "observer.notification.received",
      timestamp: "2026-08-23T00:00:00.000Z",
      source_service: "observer.notifications",
      correlation_id: "00000000-0000-4000-8000-000000000001",
      payload: {
        entity_ref: "notification",
        source_application: "Build Runner",
        title: "Build complete",
        capture_level: "metadata",
        body_bytes: 12,
        excluded_reason: "content_permission_missing",
      },
    });
    expect(JSON.stringify(received[0])).not.toContain("Tests passed");
  });

  it("captures an ordinary notification body only with explicit content permission", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.notification.received", async (message) => {
      received.push(message);
    });
    const observer = new NotificationObserver({
      permissions: permissions(true, true),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
    });

    await observer.enable();
    await observer.capture(notificationEvent());
    await observer.flush();

    expect(received[0]).toMatchObject({
      payload: {
        capture_level: "content",
        body: "Tests passed",
        body_bytes: 12,
      },
    });
  });

  it("never captures sensitive notification bodies even when content permission is granted", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.notification.received", async (message) => {
      received.push(message);
    });
    const observer = new NotificationObserver({
      permissions: permissions(true, true),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
    });

    await observer.enable();
    await observer.capture(
      notificationEvent({
        source_application: "Authenticator",
        title: "Verification code",
        body: "123456",
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
    expect(JSON.stringify(received[0])).not.toContain("123456");
  });

  it("rejects malformed notification events without publishing them", async () => {
    const bus = new InMemoryCommunicationBus();
    const observer = new NotificationObserver({
      permissions: permissions(true, true),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
    });

    await observer.enable();
    await expect(observer.capture(notificationEvent({ title: "" }))).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    await expect(observer.flush()).resolves.toMatchObject({ ok: true });
  });

  it("downgrades oversized bodies to metadata without publishing the body", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.notification.received", async (message) => {
      received.push(message);
    });
    const observer = new NotificationObserver({
      permissions: permissions(true, true),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
      maxBodyBytes: 4,
    });

    await observer.enable();
    await observer.capture(notificationEvent());
    await observer.flush();

    expect(received[0]).toMatchObject({
      payload: { capture_level: "metadata", excluded_reason: "body_too_large" },
    });
    expect(JSON.stringify(received[0])).not.toContain("Tests passed");
  });

  it("stops the native source and purges pending events immediately on metadata revocation", async () => {
    const permissionsStore = permissions(true, true);
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.notification.received", async (message) => {
      received.push(message);
    });
    const observer = new NotificationObserver({ permissions: permissionsStore, bridge, bus });

    await observer.enable();
    await observer.capture(notificationEvent());
    permissionsStore.update("notifications_metadata", false);
    await expect(
      observer.capture(notificationEvent({ body: "after revoke" })),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(observer.state()).toBe("Disabled");
    expect(bridge.stop).toHaveBeenCalledOnce();
    await observer.flush();
    expect(received).toHaveLength(0);
  });

  it("uses Windows UI Automation notification events rather than polling", () => {
    const source = NativeNotificationEventBridge.nativePowerShellScript();
    expect(source).toContain("NotificationEvent");
    expect(source).toContain("AddAutomationEventHandler");
    expect(source).toContain("AutomationElement.RootElement");
    expect(source).not.toContain("Get-Notification");
  });
});
