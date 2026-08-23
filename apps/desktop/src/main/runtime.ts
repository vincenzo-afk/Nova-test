import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ObservationIndexer } from "@nova/memory";
import {
  Executor,
  PermissionGrantStore,
  PermissionManager,
  Planner,
  RuntimeApplication,
  Verifier,
  type RuntimeApplicationOptions,
} from "@nova/runtime";
import { openDesktopPersistence } from "./persistence.js";
import {
  createDesktopAccessibilityDefinition,
  createDesktopAccessibilityTool,
  createDesktopScreenCaptureDefinition,
  createDesktopScreenCaptureTool,
  type DesktopAgentController,
} from "./desktop-agent.js";

const desktopPermissions = [
  { source: "filesystem", granted: false },
  { source: "applications", granted: false },
  { source: "windows", granted: false },
  { source: "screen", granted: false },
  { source: "desktop_control", granted: false },
  { source: "browser", granted: false },
  { source: "clipboard_metadata", granted: false },
  { source: "clipboard_content", granted: false },
  { source: "notifications", granted: false },
] as const;

const desktopConfiguration = {
  schema_version: "1.0.0" as const,
  capabilities: {},
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: {},
  personalization: { preferences: [] },
};

export interface DesktopRuntimeOptions {
  readonly userDataPath: string;
  readonly migrationsPath?: string;
  readonly windowObserverBridge?: RuntimeApplicationOptions["windowObserverBridge"];
  readonly clipboardObserverBridge?: RuntimeApplicationOptions["clipboardObserverBridge"];
  readonly observationIndexer?: RuntimeApplicationOptions["observationIndexer"];
  readonly desktopAgent?: () => DesktopAgentController | undefined;
}

const defaultMigrationsPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../services/memory/prisma/migrations",
);

export async function createDesktopRuntime(
  options: DesktopRuntimeOptions,
): Promise<RuntimeApplication> {
  const persistence = await openDesktopPersistence({
    userDataPath: options.userDataPath,
    migrationsPath: options.migrationsPath ?? defaultMigrationsPath,
  });
  return new RuntimeApplication({
    configuration: desktopConfiguration,
    permissionStore: new PermissionGrantStore({ initial: desktopPermissions }),
    planner: new Planner({ deterministic: new Map() }),
    executor: new Executor(
      new PermissionManager({
        allowedToolIds: new Set(["nova.screen-capture", "nova.desktop-accessibility"]),
        confirmationTimeoutMs: 30_000,
      }),
      new Map([
        [
          "nova.screen-capture",
          createDesktopScreenCaptureTool(options.desktopAgent ?? (() => undefined)),
        ],
        [
          "nova.desktop-accessibility",
          createDesktopAccessibilityTool(options.desktopAgent ?? (() => undefined)),
        ],
      ]),
    ),
    verifier: new Verifier(),
    persistence: persistence.checkpointStore,
    dispose: persistence.close,
    ...(options.windowObserverBridge === undefined
      ? {}
      : { windowObserverBridge: options.windowObserverBridge }),
    ...(options.clipboardObserverBridge === undefined
      ? {}
      : { clipboardObserverBridge: options.clipboardObserverBridge }),
    observationIndexer:
      options.observationIndexer ?? new ObservationIndexer(persistence.memoryStore),
    registeredTools: [
      createDesktopScreenCaptureDefinition(),
      createDesktopAccessibilityDefinition(),
    ],
  });
}
