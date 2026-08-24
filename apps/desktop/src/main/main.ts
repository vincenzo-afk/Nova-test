import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { MemorySearchInput } from "@nova/memory";
import {
  ApiGateway,
  type ConfigurationSectionName,
  type NovaConfiguration,
  type ExecutionStep,
  type PermissionGrant,
  type RuntimeApplication,
  type GraphQueryInput,
} from "@nova/runtime";
import {
  createMessage,
  FileJsonlLogSink,
  NamedPipeCommunicationBus,
  StructuredLogger,
} from "@nova/shared";
import { createDesktopRuntime } from "./runtime.js";
import {
  DesktopAgentController,
  NativeDesktopAgentBridge,
  type ScreenshotRequest,
  type AccessibilityReadRequest,
  type UiActionRequest,
} from "./desktop-agent.js";
import { cancelDesktopTask, listDesktopTasks, type DesktopTaskListPage } from "./task-controls.js";
import { parseBrowserMetadataEvent } from "./browser-gateway.js";
import { readDiagnostics } from "./diagnostics.js";

interface TaskSnapshot {
  readonly task_id: string;
  readonly goal: string;
  readonly state: string;
  readonly retry_count?: number;
}
let gatewayBus: NamedPipeCommunicationBus | undefined;
let runtimeApplication: RuntimeApplication | undefined;
let desktopAgent: DesktopAgentController | undefined;

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

const executeDesktopStep = async (
  input: Omit<
    ExecutionStep,
    "step_id" | "correlation_id" | "capability_id" | "task_id" | "confirmation_status"
  > & {
    readonly task_id: string;
    readonly confirmation_status: ExecutionStep["confirmation_status"];
  },
): Promise<unknown> => {
  if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
  const result = await runtimeApplication.executeToolStep({
    ...input,
    step_id: randomUUID(),
    correlation_id: randomUUID(),
    capability_id: "desktop-agent",
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value.execution.evidence.value;
};

ipcMain.handle("nova:task:submit", (_event, payload: { readonly goal: string }) =>
  requestGateway<TaskSnapshot>("task.submit", { goal: payload.goal }),
);
ipcMain.handle(
  "nova:task:list",
  (_event, payload: { readonly limit?: number; readonly cursor?: string } = {}) => {
    if (
      payload.limit !== undefined &&
      (!Number.isInteger(payload.limit) || payload.limit <= 0 || payload.limit > 200)
    ) {
      throw new Error("Task list limit must be an integer from 1 to 200.");
    }
    if (payload.cursor !== undefined && typeof payload.cursor !== "string") {
      throw new Error("Task list cursor must be opaque text.");
    }
    return requestGateway<DesktopTaskListPage>("task.list", payload);
  },
);
ipcMain.handle("nova:task:cancel", (_event, payload: { readonly task_id: string }) =>
  requestGateway<TaskSnapshot>("task.cancel", { task_id: payload.task_id }),
);
ipcMain.handle("nova:memory:search", (_event, payload: MemorySearchInput) =>
  requestGateway("memory.search", payload),
);
ipcMain.handle("nova:memory:record", (_event, payload: { readonly record_id: string }) =>
  requestGateway("memory.record", payload),
);
ipcMain.handle("nova:graph:query", (_event, payload: GraphQueryInput) =>
  requestGateway("graph.query", payload),
);
ipcMain.handle("nova:diagnostics:get", () => requestGateway("diagnostics.get", undefined));
ipcMain.handle("nova:desktop:screenshot", (_event, payload: ScreenshotRequest) =>
  requestGateway("desktop.screenshot", payload),
);
ipcMain.handle("nova:desktop:ui-action", (_event, payload: UiActionRequest) =>
  requestGateway("desktop.ui-action", payload),
);
ipcMain.handle("nova:desktop:ui-read", (_event, payload: AccessibilityReadRequest) =>
  requestGateway("desktop.ui-read", payload),
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
  const diagnosticsPath = join(app.getPath("userData"), "logs", "nova.jsonl");
  const logger = new StructuredLogger({
    service: "desktop.main",
    sink: new FileJsonlLogSink(diagnosticsPath),
  });
  gatewayBus = new NamedPipeCommunicationBus(
    {
      path: join(app.getPath("userData"), "nova-api.sock"),
      role: "server",
    },
    logger,
  );
  const gateway = new ApiGateway(gatewayBus, logger);
  runtimeApplication = await createDesktopRuntime({
    logger,
    userDataPath: app.getPath("userData"),
    migrationsPath: join(app.getAppPath(), "dist", "migrations"),
    desktopAgent: () => desktopAgent,
  });
  desktopAgent = new DesktopAgentController({
    permissions: runtimeApplication.permissions,
    focus: () => runtimeApplication?.worldModel.focus() ?? null,
    bridge: new NativeDesktopAgentBridge(),
    confirm: async (request) => {
      const confirmation = await dialog.showMessageBox({
        type: "warning",
        title: "Nova confirmation required",
        message: `Confirm ${request.action_id} in ${request.expected_window_id}?`,
        detail: "This desktop action may cause an irreversible change.",
        buttons: ["Cancel", "Confirm"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });
      return confirmation.response === 1;
    },
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
  gateway.register("memory.search", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const payload = data as MemorySearchInput;
    const result = await runtimeApplication.searchMemory(payload);
    if (!result.ok) throw new Error(result.error.message);
    return { results: result.value, query: payload.query };
  });
  gateway.register("memory.record", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const payload = data as { readonly record_id?: string };
    if (!payload.record_id) throw new Error("Memory record ID is required.");
    const result = await runtimeApplication.getMemoryRecord(payload.record_id);
    if (!result.ok) {
      if (result.error.code === "NOVA-MEM003") throw new Error("Memory record not found.");
      throw new Error(result.error.message);
    }
    return result.value;
  });
  gateway.register("graph.query", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const payload = data as GraphQueryInput;
    const result = runtimeApplication.queryGraph(payload);
    if (!result.ok) {
      if (result.error.code === "NOVA-MEM003") throw new Error("Graph node not found.");
      throw new Error(result.error.message);
    }
    return result.value;
  });
  gateway.register("diagnostics.get", async () => readDiagnostics(diagnosticsPath));
  gateway.register("task.list", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const payload = data as { readonly limit?: number; readonly cursor?: string };
    const page = listDesktopTasks(runtimeApplication.tasks.list(), payload);
    if (!page.ok) throw new Error(page.error.message);
    return page.value;
  });
  gateway.register("desktop.screenshot", async (data) => {
    const payload = data as ScreenshotRequest;
    return await executeDesktopStep({
      task_id: payload.task_id,
      resolved_tool_id: "nova.screen-capture",
      action_id: "screenshot",
      parameters: payload as unknown as Readonly<Record<string, unknown>>,
      risk_tier: "read_only",
      execution_tier: "vision",
      required_locks: ["desktop.screen"],
      timeout_ms: 15_000,
      confirmation_status: "not_required",
    });
  });
  gateway.register("desktop.ui-read", async (data) => {
    const payload = data as AccessibilityReadRequest;
    return await executeDesktopStep({
      task_id: payload.task_id,
      resolved_tool_id: "nova.desktop-accessibility",
      action_id: "read_state",
      parameters: payload as unknown as Readonly<Record<string, unknown>>,
      risk_tier: "read_only",
      execution_tier: "accessibility",
      required_locks: ["desktop.focus", "desktop.accessibility"],
      timeout_ms: 15_000,
      confirmation_status: "not_required",
    });
  });
  gateway.register("desktop.ui-action", async (data) => {
    const payload = data as UiActionRequest;
    const destructive = payload.risk_tier === "destructive_irreversible";
    if (destructive) {
      if (!desktopAgent) throw new Error("Desktop agent is not ready.");
      const confirmed = await desktopAgent.confirmDestructiveUiAction(payload);
      if (!confirmed) throw new Error("Destructive UI action was not confirmed.");
    }
    const approvedPayload = destructive ? { ...payload, confirmed: true } : payload;
    return await executeDesktopStep({
      task_id: payload.task_id,
      resolved_tool_id: "nova.desktop-accessibility",
      action_id: destructive ? "ui_action_destructive" : "ui_action",
      parameters: approvedPayload as unknown as Readonly<Record<string, unknown>>,
      risk_tier: payload.risk_tier,
      execution_tier: "accessibility",
      required_locks: ["desktop.focus", "desktop.accessibility"],
      timeout_ms: 15_000,
      confirmation_status: destructive || payload.confirmed === true ? "approved" : "not_required",
    });
  });
  gateway.register("browser.activity.capture", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const parsed = parseBrowserMetadataEvent(data);
    if (!parsed.ok) throw new Error(parsed.error.message);
    const result = await runtimeApplication.captureBrowserEvent(parsed.value);
    if (!result.ok) throw new Error(result.error.message);
    return { accepted: true };
  });
  gateway.register("task.cancel", async (data) => {
    if (!runtimeApplication) throw new Error("Nova runtime is not ready.");
    const payload = data as { readonly task_id?: string };
    if (!payload.task_id) throw new Error("Task ID is required.");
    const cancelled = cancelDesktopTask(
      runtimeApplication.tasks,
      runtimeApplication.scheduler,
      payload.task_id,
    );
    if (!cancelled.ok) throw new Error(cancelled.error.message);
    return cancelled.value;
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
