import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGrantStore } from "../../runtime/src/permission-grant-store.js";
import { InMemoryCommunicationBus } from "@nova/shared";
import {
  BrowserObserver,
  NativeBrowserEventBridge,
  type NativeBrowserEvent,
} from "../src/browser-observer.js";

const browserEvent = (overrides: Partial<NativeBrowserEvent> = {}): NativeBrowserEvent => ({
  type: "tab_updated",
  browser: "chromium",
  tab_id: 42,
  window_id: 7,
  url: "https://example.com/docs/page?token=secret#private-section",
  title: "Documentation",
  active: true,
  ...overrides,
});

const permissions = (granted = true) =>
  new PermissionGrantStore({ initial: [{ source: "browser_metadata", granted }] });

describe("BrowserObserver", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("does not start or publish before browser metadata permission is granted", async () => {
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const observer = new BrowserObserver({
      permissions: permissions(false),
      bridge,
      bus: new InMemoryCommunicationBus(),
      excludedDomains: [],
    });

    await expect(observer.enable()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(bridge.start).not.toHaveBeenCalled();
    await expect(observer.capture(browserEvent())).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });

  it("publishes bounded tab metadata with query, fragment, credentials, and page content removed", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.browser.navigation", async (message) => {
      received.push(message);
    });
    const observer = new BrowserObserver({
      permissions: permissions(),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
      excludedDomains: [],
      now: () => "2026-08-23T00:00:00.000Z",
    });

    await observer.enable();
    await observer.capture(
      browserEvent({
        url: "https://alice:secret@example.com/docs/page?token=secret#private-section",
        title: "A".repeat(700),
      }),
    );
    await observer.flush();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      topic: "observer.browser.navigation",
      timestamp: "2026-08-23T00:00:00.000Z",
      source_service: "observer.browser",
      payload: {
        browser: "chromium",
        tab_id: 42,
        window_id: 7,
        url: "https://example.com/docs/page",
        title: "A".repeat(512),
        active: true,
        event_type: "tab_updated",
      },
    });
    expect(JSON.stringify(received[0])).not.toContain("secret");
    expect(JSON.stringify(received[0])).not.toContain("private-section");
    expect(JSON.stringify(received[0])).not.toContain("body");
  });

  it("drops events from explicitly excluded domains before publication", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.browser.navigation", async (message) => {
      received.push(message);
    });
    const observer = new BrowserObserver({
      permissions: permissions(),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
      excludedDomains: ["bank.example.com", "*.private.example"],
    });

    await observer.enable();
    await observer.capture(browserEvent({ url: "https://bank.example.com/accounts?x=1" }));
    await observer.capture(browserEvent({ url: "https://mail.private.example/settings" }));
    await observer.flush();

    expect(received).toHaveLength(0);
  });

  it("applies updated excluded-domain policy before publication", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.browser.navigation", async (message) => {
      received.push(message);
    });
    const observer = new BrowserObserver({
      permissions: permissions(),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
      excludedDomains: [],
    });

    await observer.enable();
    observer.setExcludedDomains(["example.com"]);
    await observer.capture(browserEvent());
    await observer.flush();

    expect(received).toHaveLength(0);
  });

  it("coalesces duplicate tab state to the latest metadata before flush", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.browser.navigation", async (message) => {
      received.push(message);
    });
    const observer = new BrowserObserver({
      permissions: permissions(),
      bridge: { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) },
      bus,
      excludedDomains: [],
    });

    await observer.enable();
    await observer.capture(browserEvent({ title: "Old" }));
    await observer.capture(browserEvent({ title: "New", url: "https://example.com/new" }));
    await observer.flush();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      payload: { title: "New", url: "https://example.com/new" },
    });
  });

  it("stops the extension bridge and purges pending state immediately on revocation", async () => {
    const permissionStore = permissions();
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.browser.navigation", async (message) => {
      received.push(message);
    });
    const observer = new BrowserObserver({
      permissions: permissionStore,
      bridge,
      bus,
      excludedDomains: [],
    });

    await observer.enable();
    await observer.capture(browserEvent());
    permissionStore.update("browser_metadata", false);
    await expect(observer.capture(browserEvent({ title: "after revoke" }))).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(observer.state()).toBe("Disabled");
    expect(bridge.stop).toHaveBeenCalledOnce();
    await observer.flush();
    expect(received).toHaveLength(0);
  });

  it("publishes bridge-delivered metadata after capture", async () => {
    const bus = new InMemoryCommunicationBus();
    const received: unknown[] = [];
    await bus.subscribe("observer.browser.navigation", async (message) => {
      received.push(message);
    });
    const bridge = new NativeBrowserEventBridge();
    const observer = new BrowserObserver({
      permissions: permissions(),
      bridge,
      bus,
      excludedDomains: [],
    });

    await observer.enable();
    await bridge.receive(browserEvent());

    expect(received).toHaveLength(1);
  });

  it("uses a local extension bridge and never requests page content", () => {
    const source = NativeBrowserEventBridge.extensionProtocolDescription();
    expect(source).toContain("Native Messaging");
    expect(source).toContain("tabs.onUpdated");
    expect(source).toContain("tabs.onActivated");
    expect(source).not.toContain("document.body");
    expect(source).not.toContain("innerText");
  });
});
