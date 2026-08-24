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
  createPairingOffer: (input: unknown) => ipcRenderer.invoke("nova:devices:pairing-offer", input),
  completePairing: (code: string, request: unknown) =>
    ipcRenderer.invoke("nova:devices:pairing-complete", { code, request }),
  revokeTrustedDevice: (deviceId: string) =>
    ipcRenderer.invoke("nova:devices:revoke", { device_id: deviceId }),
  getTrustedDevices: () => ipcRenderer.invoke("nova:devices:trusted"),
  getDeviceSnapshots: () => ipcRenderer.invoke("nova:devices:snapshots"),
  negotiateDeviceCapability: (deviceId: string, capabilityId: string) =>
    ipcRenderer.invoke("nova:devices:negotiate", {
      device_id: deviceId,
      capability_id: capabilityId,
    }),
  getDiagnostics: () => ipcRenderer.invoke("nova:diagnostics:get"),
  getUpdateInfo: () => ipcRenderer.invoke("nova:updates:get"),
  validateWorkflow: (draft: unknown) => ipcRenderer.invoke("nova:workflow:validate", draft),
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
