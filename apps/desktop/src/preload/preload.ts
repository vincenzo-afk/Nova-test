import { contextBridge, ipcRenderer } from "electron";

const novaApi = {
  submitTask: (goal: string) => ipcRenderer.invoke("nova:task:submit", { goal }),
  getTask: (taskId: string) => ipcRenderer.invoke("nova:task:get", { task_id: taskId }),
  listTasks: (limit?: number, cursor?: string) =>
    ipcRenderer.invoke("nova:task:list", { limit, cursor }),
  cancelTask: (taskId: string) => ipcRenderer.invoke("nova:task:cancel", { task_id: taskId }),
  getPermissions: () => ipcRenderer.invoke("nova:permissions:get"),
  setPermission: (source: string, granted: boolean) =>
    ipcRenderer.invoke("nova:permissions:set", { source, granted }),
  getConfig: () => ipcRenderer.invoke("nova:config:get"),
  updateConfig: (section: string, value: unknown) =>
    ipcRenderer.invoke("nova:config:update", { section, value }),
};

contextBridge.exposeInMainWorld("nova", novaApi);
