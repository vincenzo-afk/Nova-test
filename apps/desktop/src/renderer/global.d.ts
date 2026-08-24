import type {
  ConfigurationSectionName,
  DeviceRuntimeMode,
  NovaConfiguration,
  PairingRequest,
} from "@nova/runtime";
import type { PermissionGrant } from "./shell-model.js";

interface DesktopMemorySearchInput {
  query: string;
  filters?: {
    project?: string;
    time_range?: { start: string; end: string };
    entity_type?: string;
  };
}

interface DesktopMemoryRecord {
  record_id: string;
  tier: "working" | "recent" | "long_term";
  content_ref: string;
  confidence?: number;
  schema_version: string;
  created_at: string;
  status?: string;
  lineage: Array<{ relation: string; source_record_id: string }>;
}

interface DesktopGraphQueryInput {
  node_id: string;
  direction: "in" | "out" | "both";
  edge_type?: string;
  depth: number;
}

interface DesktopGraphQueryResult {
  root: {
    id: string;
    type: string;
    name: string;
    properties: Record<string, string | number | boolean>;
    active: boolean;
  };
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    properties: Record<string, string | number | boolean>;
    active: boolean;
  }>;
  edges: Array<{
    id: string;
    type: string;
    from_node_id: string;
    to_node_id: string;
    weight: number;
  }>;
}

declare global {
  interface Window {
    nova: {
      submitTask: (goal: string) => Promise<{ task_id: string; goal: string; state: string }>;
      getTask: (taskId: string) => Promise<{ task_id: string; goal: string; state: string }>;
      listTasks: (
        limit?: number,
        cursor?: string,
      ) => Promise<{
        items: Array<{ task_id: string; goal: string; state: string; retry_count: number }>;
        next_cursor: string | null;
        has_more: boolean;
      }>;
      cancelTask: (taskId: string) => Promise<{ task_id: string; goal: string; state: string }>;
      searchMemory: (input: DesktopMemorySearchInput) => Promise<{
        results: DesktopMemoryRecord[];
        query: string;
      }>;
      getMemoryRecord: (recordId: string) => Promise<DesktopMemoryRecord>;
      queryGraph: (input: DesktopGraphQueryInput) => Promise<DesktopGraphQueryResult>;
      syncDevices: () => Promise<{
        ok: boolean;
        value?: { checkpoint: number; applied_change_ids: string[] };
        error?: { code: string; message: string; retryable: boolean };
      }>;
      flushDeviceSync: () => Promise<{
        ok: boolean;
        value?: { pushed_change_ids: string[] };
        error?: { code: string; message: string; retryable: boolean };
      }>;
      getAndroidCompanionPermission: (permission: string) => Promise<{
        ok: boolean;
        value?: "Granted" | "Revoked";
        error?: { code: string; message: string; retryable: boolean };
      }>;
      setAndroidCompanionPermission: (
        permission: string,
        granted: boolean,
      ) => Promise<{
        ok: boolean;
        error?: { code: string; message: string; retryable: boolean };
      }>;
      checkAndroidCompanionCapability: (input: {
        capability_id: string;
        required_permissions: string[];
      }) => Promise<{
        ok: boolean;
        value?: { status: "Available"; device_id: string };
        error?: { code: string; message: string; retryable: boolean };
      }>;
      createPairingOffer: (input: {
        runtime_mode: DeviceRuntimeMode;
        primary_public_key: string;
      }) => Promise<{
        ok: boolean;
        value?: {
          code: string;
          channel_token: string;
          primary_public_key: string;
          runtime_mode: DeviceRuntimeMode;
          expires_at: number;
        };
        error?: { code: string; message: string; retryable: boolean };
      }>;
      completePairing: (
        code: string,
        request: PairingRequest,
      ) => Promise<{
        ok: boolean;
        value?: {
          device_id: string;
          device_public_key: string;
          runtime_mode: DeviceRuntimeMode;
          state: "Trusted";
          paired_at: number;
        };
        error?: { code: string; message: string; retryable: boolean };
      }>;
      revokeTrustedDevice: (deviceId: string) => Promise<{
        ok: boolean;
        error?: { code: string; message: string; retryable: boolean };
      }>;
      getTrustedDevices: () => Promise<
        Array<{
          device_id: string;
          device_public_key: string;
          runtime_mode: "Full peer" | "Companion";
          state: "Trusted";
          paired_at: number;
        }>
      >;
      getDeviceSnapshots: () => Promise<
        Array<{
          device_id: string;
          presence: "Online" | "Idle" | "Busy" | "Sleeping" | "Offline" | "Syncing" | "Updating";
          capabilities: Array<{
            capability_id: string;
            status: "Supported" | "Not supported" | "Permission denied" | "Degraded";
          }>;
        }>
      >;
      negotiateDeviceCapability: (
        deviceId: string,
        capabilityId: string,
      ) => Promise<{
        ok: boolean;
        value?: {
          device_id: string;
          capability_id: string;
          status: "Supported" | "Not supported" | "Permission denied" | "Degraded";
        };
        error?: { code: string; message: string; retryable: boolean };
      }>;
      getDiagnostics: () => Promise<{
        collected_at: string;
        partial: boolean;
        records: Array<{
          timestamp: string;
          service: string;
          severity: "debug" | "info" | "warning" | "error" | "critical";
          event: string;
          correlation_id?: string;
        }>;
      }>;
      getUpdateInfo: () => Promise<{
        checked_at: string;
        current_version: string;
        latest_version: string | null;
        update_available: boolean;
        rollback_available: boolean;
        update_service: "not_configured";
        changelog: Array<{ version: string; date: string }>;
        partial: boolean;
      }>;
      validateWorkflow: (draft: {
        workflow_id: string;
        start_node_id: string;
        nodes: Array<{
          id: string;
          type:
            "task" | "decision" | "parallel_split" | "join" | "human_approval" | "rollback" | "end";
        }>;
        edges: Array<{ from: string; to: string; condition?: string }>;
      }) => Promise<
        | { valid: true; workflow_id: string; node_count: number; edge_count: number }
        | { valid: false; code: "NOVA-WFL001" | "NOVA-WFL002"; message: string }
      >;
      captureScreenshot: (request: {
        task_id: string;
        target: "screen" | "focused-window";
        max_bytes?: number;
      }) => Promise<{
        mime_type: "image/png";
        width: number;
        height: number;
        byte_length: number;
        data_base64: string;
        captured_at: string;
      }>;
      executeUiAction: (request: {
        task_id: string;
        action_id: string;
        action: "invoke" | "set_value";
        risk_tier: "read_only" | "reversible_write" | "destructive_irreversible";
        expected_window_id: string;
        target: { name?: string; automation_id?: string; control_type?: string };
        value?: string;
        confirmed?: boolean;
      }) => Promise<{
        action_id: string;
        outcome: "completed" | "unverified";
        verification: "accessibility_state";
        detail: string;
        resulting_value?: string;
        accessibility_state?: {
          task_id: string;
          window_id: string;
          name: string;
          automation_id: string;
          control_type: string;
          enabled: boolean;
          offscreen: boolean;
          value?: string;
        };
      }>;
      readAccessibilityState: (request: {
        task_id: string;
        expected_window_id: string;
        target: { name?: string; automation_id?: string; control_type?: string };
      }) => Promise<{
        task_id: string;
        window_id: string;
        name: string;
        automation_id: string;
        control_type: string;
        enabled: boolean;
        offscreen: boolean;
        value?: string;
      }>;
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
