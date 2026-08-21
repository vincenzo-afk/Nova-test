import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";

interface PermissionGrant {
  readonly source: string;
  granted: boolean;
}

const permissions: PermissionGrant[] = [
  { source: "filesystem", granted: false },
  { source: "applications", granted: false },
  { source: "windows", granted: false },
  { source: "browser", granted: false },
  { source: "clipboard", granted: false },
  { source: "notifications", granted: false },
];

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.NOVA_DEV_SERVER === "true") {
    await window.loadURL("http://127.0.0.1:5173");
  } else {
    await window.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

ipcMain.handle("nova:task:submit", (_event, payload: { readonly goal: string }) => ({
  task_id: `task-${Date.now()}`,
  goal: payload.goal,
  state: "Created",
}));

ipcMain.handle("nova:permissions:get", () => permissions);
ipcMain.handle(
  "nova:permissions:set",
  (_event, payload: { readonly source: string; readonly granted: boolean }) => {
    const permission = permissions.find((item) => item.source === payload.source);
    if (permission) {
      permission.granted = payload.granted;
    }
    return permissions;
  },
);

app.whenReady().then(async () => {
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
