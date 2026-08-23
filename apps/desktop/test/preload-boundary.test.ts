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
    api.getPermissions();
    api.setPermission("filesystem", true);
    api.getConfig();
    api.updateConfig("personalization", { preferences: [] });

    expect(invoke).toHaveBeenNthCalledWith(1, "nova:task:submit", { goal: "read README" });
    expect(invoke).toHaveBeenNthCalledWith(2, "nova:task:get", { task_id: "task-1" });
    expect(invoke).toHaveBeenNthCalledWith(3, "nova:task:list", { limit: 25, cursor: "cursor-1" });
    expect(invoke).toHaveBeenNthCalledWith(4, "nova:task:cancel", { task_id: "task-1" });
    expect(invoke).toHaveBeenNthCalledWith(5, "nova:permissions:get");
    expect(invoke).toHaveBeenNthCalledWith(6, "nova:permissions:set", {
      source: "filesystem",
      granted: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(7, "nova:config:get");
    expect(invoke).toHaveBeenNthCalledWith(8, "nova:config:update", {
      section: "personalization",
      value: { preferences: [] },
    });
  });
});
