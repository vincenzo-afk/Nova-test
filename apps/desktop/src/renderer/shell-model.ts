export type DesktopView = "permissions" | "chat" | "tasks" | "memory" | "graph";

export interface PermissionGrant {
  readonly source: string;
  readonly granted: boolean;
}

export const initialView = (firstRun: boolean): DesktopView => (firstRun ? "permissions" : "chat");

export const viewLabel: Readonly<Record<DesktopView, string>> = {
  permissions: "Permission Center",
  chat: "Chat",
  tasks: "Task Monitor",
  memory: "Memory Explorer",
  graph: "Graph Explorer",
};

export const canOpenView = (view: DesktopView, firstRun: boolean): boolean =>
  !firstRun || view === "permissions";
