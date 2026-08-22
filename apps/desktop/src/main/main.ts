import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { ApiGateway, type RuntimeApplication } from "@nova/runtime";
import { createMessage, NamedPipeCommunicationBus } from "@nova/shared";
import { createDesktopRuntime } from "./runtime.js";

interface PermissionGrant {
  readonly source: string;
  granted: boolean;
}

interface TaskSnapshot {
  readonly task_id: string;
  readonly goal: string;
  readonly state: string;
}

const permissions: PermissionGrant[] = [
  { source: "filesystem", granted: false },
  { source: "applications", granted: false },
  { source: "windows", granted: false },
  { source: "browser", granted: false },
  { source: "clipboard", granted: false },
  { source: "notifications", granted: false },
];

let gatewayBus: NamedPipeCommunicationBus | undefined;
let runtimeApplication: RuntimeApplication | undefined;

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

const requestGateway = async <TValue>(operation: string, data: unknown): Promise<TValue> => {
  if (!gatewayBus) throw new Error("Nova API Gateway is not ready.");
  const replyTo = `api.internal.response.${randomUUID()}`;
  const requestId = randomUUID();
  return await new Promise<TValue>((resolve, reject) => {
    const unsubscribe = gatewayBus?.subscribe(replyTo, async (message) => {
      unsubscribe?.();
      const payload = message.payload as {
        readonly ok?: boolean;
        readonly data?: TValue;
        readonly error?: { readonly message: string };
      };
      if (payload.ok) resolve(payload.data as TValue);
      else reject(new Error(payload.error?.message ?? "Nova API request failed."));
    });
    void gatewayBus
      ?.publish(
        createMessage({
          topic: "api.internal.request",
          schema_version: "1.0.0",
          correlation_id: randomUUID(),
          source_service: "ui.layer",
          payload: { operation, request_id: requestId, reply_to: replyTo, data },
        }),
      )
      .then((result) => {
        if (!result.ok) {
          unsubscribe?.();
          reject(new Error(result.error.message));
        }
      });
  });
};

ipcMain.handle("nova:task:submit", (_event, payload: { readonly goal: string }) =>
  requestGateway<TaskSnapshot>("task.submit", { goal: payload.goal }),
);
ipcMain.handle("nova:permissions:get", () =>
  requestGateway<PermissionGrant[]>("permissions.get", undefined),
);
ipcMain.handle(
  "nova:permissions:set",
  (_event, payload: { readonly source: string; readonly granted: boolean }) =>
    requestGateway<PermissionGrant[]>("permissions.set", payload),
);

const startGateway = async (): Promise<void> => {
  gatewayBus = new NamedPipeCommunicationBus({
    path: join(app.getPath("userData"), "nova-api.sock"),
    role: "server",
  });
  const gateway = new ApiGateway(gatewayBus);
  runtimeApplication = createDesktopRuntime();
  await runtimeApplication.start();
  gateway.register("task.submit", async (data) => {
    const payload = data as { readonly goal?: string };
    if (!payload.goal) throw new Error("Task goal is required.");
    const result = runtimeApplication?.coordinator.submit({ goal: payload.goal });
    if (!result?.ok) throw new Error(result?.error.message ?? "Task submission failed.");
    return result.value satisfies TaskSnapshot;
  });
  gateway.register("permissions.get", async () =>
    permissions.map((permission) => ({ ...permission })),
  );
  gateway.register("permissions.set", async (data) => {
    const payload = data as { readonly source?: string; readonly granted?: boolean };
    const permission = permissions.find((item) => item.source === payload.source);
    if (permission && typeof payload.granted === "boolean") permission.granted = payload.granted;
    return permissions.map((item) => ({ ...item }));
  });
  await gatewayBus.start();
  await gateway.start();
};

app.whenReady().then(async () => {
  await startGateway();
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("before-quit", () => {
  void runtimeApplication?.stop();
  void gatewayBus?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
