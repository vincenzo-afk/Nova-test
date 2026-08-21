export type DesktopView =
  | "home"
  | "permissions"
  | "chat"
  | "tasks"
  | "memory"
  | "graph"
  | "workflow"
  | "voice"
  | "devices"
  | "provider"
  | "plugins"
  | "diagnostics"
  | "logs"
  | "settings"
  | "updates";

export interface PermissionGrant {
  readonly source: string;
  readonly granted: boolean;
}

export const desktopNavOrder: readonly DesktopView[] = [
  "home",
  "chat",
  "tasks",
  "memory",
  "graph",
  "workflow",
  "voice",
  "devices",
  "provider",
  "plugins",
  "diagnostics",
  "logs",
  "settings",
  "updates",
  "permissions",
];

export const initialView = (firstRun: boolean): DesktopView => (firstRun ? "permissions" : "home");

export const viewLabel: Readonly<Record<DesktopView, string>> = {
  home: "Home",
  permissions: "Permission Center",
  chat: "Chat",
  tasks: "Task Monitor",
  memory: "Memory Explorer",
  graph: "Graph Explorer",
  workflow: "Workflow Builder",
  voice: "Voice",
  devices: "Device Management",
  provider: "Provider Settings",
  plugins: "Plugins / Marketplace",
  diagnostics: "Diagnostics",
  logs: "Logs",
  settings: "Settings",
  updates: "Updates",
};

export const canOpenView = (view: DesktopView, firstRun: boolean): boolean =>
  !firstRun || view === "permissions";

export type ProviderMode = "local" | "cloud";

export const isOnboardingComplete = (
  providerMode: ProviderMode | null,
  observerGranted: boolean,
  demonstrationTaskCompleted: boolean,
): boolean => providerMode !== null && observerGranted && demonstrationTaskCompleted;
