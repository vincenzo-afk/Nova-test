import {
  Executor,
  PermissionGrantStore,
  PermissionManager,
  Planner,
  RuntimeApplication,
  Verifier,
} from "@nova/runtime";

const desktopPermissions = [
  { source: "filesystem", granted: false },
  { source: "applications", granted: false },
  { source: "windows", granted: false },
  { source: "browser", granted: false },
  { source: "clipboard", granted: false },
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
  personalization: {},
};

export const createDesktopRuntime = (): RuntimeApplication =>
  new RuntimeApplication({
    configuration: desktopConfiguration,
    permissionStore: new PermissionGrantStore({ initial: desktopPermissions }),
    planner: new Planner({ deterministic: new Map() }),
    executor: new Executor(
      new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
      new Map(),
    ),
    verifier: new Verifier(),
  });
