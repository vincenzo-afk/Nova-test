import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDesktopRuntime } from "../src/main/runtime.js";

const runtimes: Array<Awaited<ReturnType<typeof createDesktopRuntime>>> = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.stop()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("desktop runtime composition", () => {
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
      { source: "browser", granted: false },
      { source: "clipboard", granted: false },
      { source: "notifications", granted: false },
    ]);
  });
});
