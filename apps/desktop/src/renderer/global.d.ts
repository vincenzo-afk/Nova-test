import type { ConfigurationSectionName, NovaConfiguration } from "@nova/runtime";
import type { PermissionGrant } from "./shell-model.js";

declare global {
  interface Window {
    nova: {
      submitTask: (goal: string) => Promise<{ task_id: string; goal: string; state: string }>;
      getTask: (taskId: string) => Promise<{ task_id: string; goal: string; state: string }>;
      getPermissions: () => Promise<PermissionGrant[]>;
      setPermission: (source: string, granted: boolean) => Promise<PermissionGrant[]>;
      getConfig: () => Promise<NovaConfiguration>;
      updateConfig: (
        section: ConfigurationSectionName,
        value: NovaConfiguration[ConfigurationSectionName],
      ) => Promise<NovaConfiguration>;
    };
  }
}

export {};
