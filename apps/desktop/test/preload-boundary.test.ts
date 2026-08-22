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
    expect(Object.keys(api)).toEqual(["submitTask", "getTask", "getPermissions", "setPermission"]);
  });

  it("forwards task and permission calls through IPC", async () => {
    await import("../src/preload/preload.js");
    const [, api] = exposeInMainWorld.mock.calls[0] as [
      string,
      {
        submitTask: (goal: string) => unknown;
        getTask: (taskId: string) => unknown;
        getPermissions: () => unknown;
        setPermission: (source: string, granted: boolean) => unknown;
      },
    ];

    api.submitTask("read README");
    api.getTask("task-1");
    api.getPermissions();
    api.setPermission("filesystem", true);

    expect(invoke).toHaveBeenNthCalledWith(1, "nova:task:submit", { goal: "read README" });
    expect(invoke).toHaveBeenNthCalledWith(2, "nova:task:get", { task_id: "task-1" });
    expect(invoke).toHaveBeenNthCalledWith(3, "nova:permissions:get");
    expect(invoke).toHaveBeenNthCalledWith(4, "nova:permissions:set", {
      source: "filesystem",
      granted: true,
    });
  });
});
