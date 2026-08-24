import { contextBridge, ipcRenderer } from "electron";

const novaApi = {
  submitTask: (goal: string) => ipcRenderer.invoke("nova:task:submit", { goal }),
  getTask: (taskId: string) => ipcRenderer.invoke("nova:task:get", { task_id: taskId }),
  listTasks: (limit?: number, cursor?: string) =>
    ipcRenderer.invoke("nova:task:list", { limit, cursor }),
  cancelTask: (taskId: string) => ipcRenderer.invoke("nova:task:cancel", { task_id: taskId }),
  searchMemory: (input: unknown) => ipcRenderer.invoke("nova:memory:search", input),
  getMemoryRecord: (recordId: string) =>
    ipcRenderer.invoke("nova:memory:record", { record_id: recordId }),
  queryGraph: (input: unknown) => ipcRenderer.invoke("nova:graph:query", input),
  captureScreenshot: (request: unknown) => ipcRenderer.invoke("nova:desktop:screenshot", request),
  executeUiAction: (request: unknown) => ipcRenderer.invoke("nova:desktop:ui-action", request),
  readAccessibilityState: (request: unknown) => ipcRenderer.invoke("nova:desktop:ui-read", request),
  getPermissions: () => ipcRenderer.invoke("nova:permissions:get"),
  setPermission: (source: string, granted: boolean) =>
    ipcRenderer.invoke("nova:permissions:set", { source, granted }),
  getConfig: () => ipcRenderer.invoke("nova:config:get"),
  updateConfig: (section: string, value: unknown) =>
    ipcRenderer.invoke("nova:config:update", { section, value }),
};

contextBridge.exposeInMainWorld("nova", novaApi);
