import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopRuntime } from "../src/main/runtime.js";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  DesktopAgentController,
  type DesktopFocusState,
  type NativeDesktopAgentBridgeContract,
} from "../src/main/desktop-agent.js";

const runtimes: Array<Awaited<ReturnType<typeof createDesktopRuntime>>> = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.stop()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("desktop runtime composition", () => {
  it("records runtime lifecycle evidence through the injected structured logger", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-logging-"));
    temporaryDirectories.push(userDataPath);
    const sink = new MemoryLogSink();
    const runtime = await createDesktopRuntime({
      userDataPath,
      logger: new StructuredLogger({ service: "desktop.runtime.test", sink }),
    });
    runtimes.push(runtime);

    await runtime.start();
    await runtime.stop();

    const events = sink.records().map((record) => record.event);
    expect(events).toEqual(
      expect.arrayContaining([
        "runtime.start.begin",
        "runtime.started",
        "runtime.stop.begin",
        "runtime.stopped",
      ]),
    );
    expect(JSON.stringify(sink.records())).not.toContain(userDataPath);
  });

  it("starts the native observer only after both grants and feeds ephemeral World Model focus state", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-observer-"));
    temporaryDirectories.push(userDataPath);
    const bridge = {
      start: async () => undefined,
      stop: async () => undefined,
    };
    const runtime = await createDesktopRuntime({ userDataPath, windowObserverBridge: bridge });
    runtimes.push(runtime);
    await runtime.start();

    expect(runtime.windowsObserver.state()).toBe("Disabled");
    expect(runtime.worldModel.focus()).toBeNull();
    runtime.permissions.update("applications", true);
    await runtime.syncObservers();
    expect(runtime.windowsObserver.state()).toBe("Disabled");
    runtime.permissions.update("windows", true);
    await runtime.syncObservers();
    expect(runtime.windowsObserver.state()).toBe("Active");

    await runtime.windowsObserver.capture({
      type: "window.focused",
      window: {
        window_id: "hwnd:42",
        process_id: 100,
        application_name: "Editor",
        title: "Notes.txt",
        monitor_id: "DISPLAY1",
        virtual_desktop_id: "desktop-1",
        z_order: 0,
      },
    });
    expect(runtime.worldModel.focus()).toMatchObject({
      active_application: { application_name: "Editor", process_id: 100 },
      focused_window: { window_id: "hwnd:42", title: "Notes.txt" },
    });

    runtime.permissions.update("windows", false);
    await runtime.syncObservers();
    expect(runtime.windowsObserver.state()).toBe("Disabled");
  });

  it("adopts an observer event only when an explicit task context is supplied", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-indexing-"));
    temporaryDirectories.push(userDataPath);
    const runtime = await createDesktopRuntime({
      userDataPath,
      observationIndexer: {
        index: async () => ({
          ok: true,
          value: { persisted: true, memory_id: "working-1", task_id: "task-1" },
        }),
      },
    });
    runtimes.push(runtime);
    await runtime.start();

    const result = await runtime.adoptObservation({
      task_id: "task-1",
      event: {
        message_id: "00000000-0000-4000-8000-000000000002",
        topic: "observer.application.launched",
        schema_version: "1.0.0",
        timestamp: "2026-08-23T00:00:00.000Z",
        correlation_id: "00000000-0000-4000-8000-000000000001",
        source_service: "observer.windows",
        payload: { application: { process_id: 100, application_name: "Editor" } },
      },
    });

    expect(result).toEqual({
      ok: true,
      value: { persisted: true, memory_id: "working-1", task_id: "task-1" },
    });
  });

  it("registers accessibility reads and writes through the runtime tool catalog", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-tools-"));
    temporaryDirectories.push(userDataPath);
    const runtime = await createDesktopRuntime({ userDataPath });
    runtimes.push(runtime);

    const registered = runtime.toolRegistry.get("nova.desktop-accessibility");

    expect(registered).toMatchObject({
      ok: true,
      value: {
        execution_tier: "accessibility",
        supported_actions: expect.arrayContaining([
          expect.objectContaining({
            action_id: "read_state",
            risk_tier: "read_only",
            verification_signal: "accessibility_state",
          }),
          expect.objectContaining({
            action_id: "ui_action_destructive",
            risk_tier: "destructive_irreversible",
            verification_signal: "accessibility_state",
          }),
        ]),
      },
    });
  });

  it("starts browser metadata observation only after permission and stops on revocation", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-browser-"));
    temporaryDirectories.push(userDataPath);
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const runtime = await createDesktopRuntime({ userDataPath, browserObserverBridge: bridge });
    runtimes.push(runtime);
    await runtime.start();

    expect(runtime.browserObserver.state()).toBe("Disabled");
    runtime.permissions.update("browser_metadata", true);
    await runtime.syncObservers();
    expect(runtime.browserObserver.state()).toBe("Active");
    expect(bridge.start).toHaveBeenCalledOnce();

    runtime.permissions.update("browser_metadata", false);
    await runtime.syncObservers();
    expect(runtime.browserObserver.state()).toBe("Disabled");
    expect(bridge.stop).toHaveBeenCalledOnce();
  });

  it("hot-reloads browser excluded domains before event-journal publication", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-browser-config-"));
    temporaryDirectories.push(userDataPath);
    const bridge = { start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) };
    const runtime = await createDesktopRuntime({
      userDataPath,
      browserObserverBridge: bridge,
    });
    runtimes.push(runtime);
    await runtime.start();
    runtime.permissions.update("browser_metadata", true);
    await runtime.syncObservers();
    const received: unknown[] = [];
    const unsubscribe = runtime.events.subscribe("observer.browser.navigation", async (message) => {
      received.push(message);
    });
    expect(
      runtime.configuration.update("permissions", { browser_excluded_domains: ["example.com"] }),
    ).toMatchObject({ ok: true });
    await runtime.browserObserver.capture({
      type: "tab_updated",
      browser: "chromium",
      tab_id: 42,
      window_id: 7,
      url: "https://example.com/private",
      title: "Private",
      active: true,
    });
    await runtime.browserObserver.flush();
    unsubscribe();
    expect(received).toHaveLength(0);
  });

  it("starts notification observation only after metadata permission and stops on revocation", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-notifications-"));
    temporaryDirectories.push(userDataPath);
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const runtime = await createDesktopRuntime({
      userDataPath,
      notificationObserverBridge: bridge,
    });
    runtimes.push(runtime);
    await runtime.start();

    expect(runtime.notificationObserver.state()).toBe("Disabled");
    runtime.permissions.update("notifications_content", true);
    await runtime.syncObservers();
    expect(runtime.notificationObserver.state()).toBe("Disabled");
    expect(bridge.start).not.toHaveBeenCalled();

    runtime.permissions.update("notifications_metadata", true);
    await runtime.syncObservers();
    expect(runtime.notificationObserver.state()).toBe("Active");
    expect(bridge.start).toHaveBeenCalledOnce();

    runtime.permissions.update("notifications_metadata", false);
    await runtime.syncObservers();
    expect(runtime.notificationObserver.state()).toBe("Disabled");
    expect(bridge.stop).toHaveBeenCalledOnce();
  });

  it("starts clipboard observation only after metadata permission and stops on revocation", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-clipboard-"));
    temporaryDirectories.push(userDataPath);
    const bridge = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const runtime = await createDesktopRuntime({ userDataPath, clipboardObserverBridge: bridge });
    runtimes.push(runtime);
    await runtime.start();

    expect(runtime.clipboardObserver.state()).toBe("Disabled");
    runtime.permissions.update("clipboard_content", true);
    await runtime.syncObservers();
    expect(runtime.clipboardObserver.state()).toBe("Disabled");
    expect(bridge.start).not.toHaveBeenCalled();

    runtime.permissions.update("clipboard_metadata", true);
    await runtime.syncObservers();
    expect(runtime.clipboardObserver.state()).toBe("Active");
    expect(bridge.start).toHaveBeenCalledOnce();

    runtime.permissions.update("clipboard_metadata", false);
    await runtime.syncObservers();
    expect(runtime.clipboardObserver.state()).toBe("Disabled");
    expect(bridge.stop).toHaveBeenCalledOnce();
  });

  it("executes an accessibility read through the runtime authorization and verification path", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-execution-"));
    temporaryDirectories.push(userDataPath);
    const controllerRef: { current: DesktopAgentController | undefined } = { current: undefined };
    const focus: DesktopFocusState = {
      active_application: { application_name: "Editor", process_id: 42 },
      focused_window: {
        window_id: "hwnd:2A",
        process_id: 42,
        application_name: "Editor",
        title: "Notes",
        monitor_id: "DISPLAY1",
        virtual_desktop_id: "desktop-1",
        z_order: 0,
      },
      updated_at: "2026-08-23T00:00:00.000Z",
      confidence: 1,
      correlation_id: "00000000-0000-4000-8000-000000000001",
    };
    const native: NativeDesktopAgentBridgeContract = {
      captureScreenshot: async () => {
        throw new Error("not used");
      },
      readAccessibilityState: async () => ({
        task_id: "task-1",
        window_id: "hwnd:2A",
        name: "Save",
        automation_id: "saveButton",
        control_type: "button",
        enabled: true,
        offscreen: false,
      }),
      executeUiAction: async () => {
        throw new Error("not used");
      },
    };
    const runtime = await createDesktopRuntime({
      userDataPath,
      desktopAgent: () => controllerRef.current,
    });
    runtimes.push(runtime);
    controllerRef.current = new DesktopAgentController({
      permissions: runtime.permissions,
      focus: () => focus,
      bridge: native,
    });
    runtime.permissions.update("desktop_control", true);

    const result = await runtime.executeToolStep({
      step_id: "step-1",
      task_id: "task-1",
      correlation_id: "00000000-0000-4000-8000-000000000002",
      capability_id: "desktop-agent",
      resolved_tool_id: "nova.desktop-accessibility",
      action_id: "read_state",
      parameters: {
        task_id: "task-1",
        expected_window_id: "hwnd:2A",
        target: { automation_id: "saveButton", control_type: "button" },
      },
      risk_tier: "read_only",
      execution_tier: "accessibility",
      required_locks: ["desktop.focus", "desktop.accessibility"],
      timeout_ms: 15_000,
      confirmation_status: "not_required",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        execution: {
          status: "success",
          evidence: { type: "accessibility_state", value: { name: "Save", enabled: true } },
        },
        verification: { outcome: "verified", verification_method: "ground_truth" },
      },
    });
  });

  it("creates the shared local runtime application with real REST and WebSocket listeners", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-composition-"));
    temporaryDirectories.push(userDataPath);
    const runtime = await createDesktopRuntime({ userDataPath });
    runtimes.push(runtime);
    await runtime.start();

    expect(runtime.restUrl()).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(runtime.websocketUrl()).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/v1\/events$/);
    expect(runtime.configuration.snapshot()).toMatchObject({ schema_version: "1.0.0" });
    const indexed = await runtime.adoptObservation({
      task_id: "task-1",
      event: {
        message_id: "00000000-0000-4000-8000-000000000003",
        topic: "observer.application.launched",
        schema_version: "1.0.0",
        timestamp: "2026-08-23T00:00:00.000Z",
        correlation_id: "00000000-0000-4000-8000-000000000001",
        source_service: "observer.windows",
        payload: { application: { process_id: 100, application_name: "Editor" } },
      },
    });
    expect(indexed).toMatchObject({ ok: true, value: { persisted: true, task_id: "task-1" } });
    expect(runtime.permissions.list()).toEqual([
      { source: "filesystem", granted: false },
      { source: "applications", granted: false },
      { source: "windows", granted: false },
      { source: "screen", granted: false },
      { source: "desktop_control", granted: false },
      { source: "browser_metadata", granted: false },
      { source: "clipboard_metadata", granted: false },
      { source: "clipboard_content", granted: false },
      { source: "notifications_metadata", granted: false },
      { source: "notifications_content", granted: false },
    ]);
  });
});
