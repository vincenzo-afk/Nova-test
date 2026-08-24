import { beforeEach, describe, expect, it, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}));

describe("Electron preload boundary", () => {
  beforeEach(async () => {
    vi.resetModules();
    exposeInMainWorld.mockReset();
    invoke.mockReset();
  });

  it("exposes only the documented Nova bridge methods", async () => {
    await import("../src/preload/preload.js");

    expect(exposeInMainWorld).toHaveBeenCalledOnce();
    const [name, api] = exposeInMainWorld.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("nova");
    expect(Object.keys(api)).toEqual([
      "submitTask",
      "getTask",
      "listTasks",
      "cancelTask",
      "searchMemory",
      "getMemoryRecord",
      "queryGraph",
      "syncDevices",
      "flushDeviceSync",
      "createPairingOffer",
      "completePairing",
      "revokeTrustedDevice",
      "getTrustedDevices",
      "getDeviceSnapshots",
      "negotiateDeviceCapability",
      "getDiagnostics",
      "getUpdateInfo",
      "validateWorkflow",
      "captureScreenshot",
      "executeUiAction",
      "readAccessibilityState",
      "getPermissions",
      "setPermission",
      "getConfig",
      "updateConfig",
    ]);
  });

  it("forwards task and permission calls through IPC", async () => {
    await import("../src/preload/preload.js");
    const [, api] = exposeInMainWorld.mock.calls[0] as [
      string,
      {
        submitTask: (goal: string) => unknown;
        getTask: (taskId: string) => unknown;
        listTasks: (limit?: number, cursor?: string) => unknown;
        cancelTask: (taskId: string) => unknown;
        searchMemory: (input: unknown) => unknown;
        getMemoryRecord: (recordId: string) => unknown;
        queryGraph: (input: unknown) => unknown;
        syncDevices: () => unknown;
        flushDeviceSync: () => unknown;
        createPairingOffer: (input: unknown) => unknown;
        completePairing: (code: string, request: unknown) => unknown;
        revokeTrustedDevice: (deviceId: string) => unknown;
        getTrustedDevices: () => unknown;
        getDeviceSnapshots: () => unknown;
        negotiateDeviceCapability: (deviceId: string, capabilityId: string) => unknown;
        getDiagnostics: () => unknown;
        getUpdateInfo: () => unknown;
        validateWorkflow: (draft: unknown) => unknown;
        captureScreenshot: (request: unknown) => unknown;
        executeUiAction: (request: unknown) => unknown;
        readAccessibilityState: (request: unknown) => unknown;
        getPermissions: () => unknown;
        setPermission: (source: string, granted: boolean) => unknown;
        getConfig: () => unknown;
        updateConfig: (section: string, value: unknown) => unknown;
      },
    ];

    api.submitTask("read README");
    api.getTask("task-1");
    api.listTasks(25, "cursor-1");
    api.cancelTask("task-1");
    api.searchMemory({ query: "deployment", filters: { project: "nova" } });
    api.getMemoryRecord("memory-1");
    api.queryGraph({ node_id: "file-1", direction: "out", depth: 1 });
    api.syncDevices();
    api.flushDeviceSync();
    api.createPairingOffer({ runtime_mode: "Companion", primary_public_key: "primary" });
    api.completePairing("PAIR-1", {
      device_id: "phone-1",
      device_public_key: "public-key",
      challenge: "challenge",
      signature: "signature",
      runtime_mode: "Companion",
      confirmed: true,
    });
    api.revokeTrustedDevice("phone-1");
    api.getTrustedDevices();
    api.getDeviceSnapshots();
    api.negotiateDeviceCapability("phone-1", "camera");
    api.getDiagnostics();
    api.getUpdateInfo();
    api.validateWorkflow({ workflow_id: "workflow-1" });
    api.captureScreenshot({ task_id: "task-1", target: "focused-window", max_bytes: 1048576 });
    api.executeUiAction({
      task_id: "task-1",
      action_id: "save-note",
      action: "invoke",
      risk_tier: "reversible_write",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    api.readAccessibilityState({
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    api.getPermissions();
    api.setPermission("filesystem", true);
    api.getConfig();
    api.updateConfig("personalization", { preferences: [] });

    expect(invoke).toHaveBeenNthCalledWith(1, "nova:task:submit", { goal: "read README" });
    expect(invoke).toHaveBeenNthCalledWith(2, "nova:task:get", { task_id: "task-1" });
    expect(invoke).toHaveBeenNthCalledWith(3, "nova:task:list", { limit: 25, cursor: "cursor-1" });
    expect(invoke).toHaveBeenNthCalledWith(4, "nova:task:cancel", { task_id: "task-1" });
    expect(invoke).toHaveBeenNthCalledWith(5, "nova:memory:search", {
      query: "deployment",
      filters: { project: "nova" },
    });
    expect(invoke).toHaveBeenNthCalledWith(6, "nova:memory:record", {
      record_id: "memory-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(7, "nova:graph:query", {
      node_id: "file-1",
      direction: "out",
      depth: 1,
    });
    expect(invoke).toHaveBeenNthCalledWith(8, "nova:devices:sync");
    expect(invoke).toHaveBeenNthCalledWith(9, "nova:devices:sync-flush");
    expect(invoke).toHaveBeenNthCalledWith(10, "nova:devices:pairing-offer", {
      runtime_mode: "Companion",
      primary_public_key: "primary",
    });
    expect(invoke).toHaveBeenNthCalledWith(11, "nova:devices:pairing-complete", {
      code: "PAIR-1",
      request: {
        device_id: "phone-1",
        device_public_key: "public-key",
        challenge: "challenge",
        signature: "signature",
        runtime_mode: "Companion",
        confirmed: true,
      },
    });
    expect(invoke).toHaveBeenNthCalledWith(12, "nova:devices:revoke", {
      device_id: "phone-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(13, "nova:devices:trusted");
    expect(invoke).toHaveBeenNthCalledWith(14, "nova:devices:snapshots");
    expect(invoke).toHaveBeenNthCalledWith(15, "nova:devices:negotiate", {
      device_id: "phone-1",
      capability_id: "camera",
    });
    expect(invoke).toHaveBeenNthCalledWith(16, "nova:diagnostics:get");
    expect(invoke).toHaveBeenNthCalledWith(17, "nova:updates:get");
    expect(invoke).toHaveBeenNthCalledWith(18, "nova:workflow:validate", {
      workflow_id: "workflow-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(19, "nova:desktop:screenshot", {
      task_id: "task-1",
      target: "focused-window",
      max_bytes: 1048576,
    });
    expect(invoke).toHaveBeenNthCalledWith(20, "nova:desktop:ui-action", {
      task_id: "task-1",
      action_id: "save-note",
      action: "invoke",
      risk_tier: "reversible_write",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    expect(invoke).toHaveBeenNthCalledWith(21, "nova:desktop:ui-read", {
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    expect(invoke).toHaveBeenNthCalledWith(22, "nova:permissions:get");
    expect(invoke).toHaveBeenNthCalledWith(23, "nova:permissions:set", {
      source: "filesystem",
      granted: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(24, "nova:config:get");
    expect(invoke).toHaveBeenNthCalledWith(25, "nova:config:update", {
      section: "personalization",
      value: { preferences: [] },
    });
  });
});
