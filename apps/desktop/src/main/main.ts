import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import {
  ApiGateway,
  type ConfigurationSectionName,
  type NovaConfiguration,
  type PermissionGrant,
  type RuntimeApplication,
} from "@nova/runtime";
import { createMessage, NamedPipeCommunicationBus } from "@nova/shared";
import { createDesktopRuntime } from "./runtime.js";

interface TaskSnapshot {
  readonly task_id: string;
  readonly goal: string;
  readonly state: string;
}

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
const configurationSections: ReadonlySet<string> = new Set([
  "capabilities",
  "devices",
  "channels",
  "plugins",
  "mcp_servers",
  "routing_policies",
  "permissions",
  "voice",
  "personalization",
]);

ipcMain.handle("nova:config:get", () => requestGateway<NovaConfiguration>("config.get", undefined));
ipcMain.handle(
  "nova:config:update",
  (
    _event,
    payload: {
      readonly section: string;
      readonly value: NovaConfiguration[ConfigurationSectionName];
    },
  ) => {
    if (!configurationSections.has(payload.section)) {
      throw new Error("Configuration section is invalid.");
    }
    return requestGateway<NovaConfiguration>("config.update", payload);
  },
);

const startGateway = async (): Promise<void> => {
  gatewayBus = new NamedPipeCommunicationBus({
    path: join(app.getPath("userData"), "nova-api.sock"),
    role: "server",
  });
  const gateway = new ApiGateway(gatewayBus);
  runtimeApplication = await createDesktopRuntime({
    userDataPath: app.getPath("userData"),
    migrationsPath: join(app.getAppPath(), "dist", "migrations"),
  });
  await runtimeApplication.start();
  gateway.register("task.submit", async (data) => {
    const payload = data as { readonly goal?: string };
    if (!payload.goal) throw new Error("Task goal is required.");
    const result = await runtimeApplication?.coordinator.submitDurable({ goal: payload.goal });
    if (!result?.ok) throw new Error(result?.error.message ?? "Task submission failed.");
    return result.value satisfies TaskSnapshot;
  });
  gateway.register("task.get", async (data) => {
    const payload = data as { readonly task_id?: string };
    if (!payload.task_id) throw new Error("Task ID is required.");
    const result = runtimeApplication?.tasks.get(payload.task_id);
    if (!result?.ok) throw new Error(result?.error.message ?? "Task lookup failed.");
    return result.value;
  });
  gateway.register("permissions.get", async () => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    return runtimeApplication.permissions.list();
  });
  gateway.register("permissions.set", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const payload = data as { readonly source?: string; readonly granted?: boolean };
    if (!payload.source || typeof payload.granted !== "boolean") {
      throw new Error("Permission source and boolean grant are required.");
    }
    const result = runtimeApplication.permissions.update(payload.source, payload.granted);
    if (!result.ok) throw new Error(result.error.message);
    const observerSync = await runtimeApplication.syncObservers();
    if (!observerSync.ok) throw new Error(observerSync.error.message);
    return runtimeApplication.permissions.list();
  });
  gateway.register("config.get", async () => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    return runtimeApplication.configuration.snapshot();
  });
  gateway.register("config.update", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const payload = data as {
      readonly section?: string;
      readonly value?: NovaConfiguration[ConfigurationSectionName];
    };
    if (
      !payload.section ||
      !configurationSections.has(payload.section) ||
      payload.value === undefined
    ) {
      throw new Error("Configuration section and value are required.");
    }
    const result = runtimeApplication.configuration.update(
      payload.section as ConfigurationSectionName,
      payload.value,
    );
    if (!result.ok) throw new Error(result.error.message);
    return runtimeApplication.configuration.snapshot();
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
