import { z } from "zod";
import {
  err,
  ok,
  type ErrorDetailValue,
  type ErrorInfo,
  type Result,
  type StructuredLogger,
} from "@nova/shared";

export const PLUGIN_PERMISSION_SCOPES = [
  "memory.read",
  "memory.write",
  "tools.read",
  "tools.register",
  "files.read",
  "files.write",
  "tools.invoke:read_only",
  "tools.invoke:reversible_write",
  "tools.invoke:destructive_irreversible",
  "task.submit",
  "task.read",
  "task.cancel",
  "config.read",
  "config.write",
  "network.external",
] as const;

export type PluginPermissionScope = (typeof PLUGIN_PERMISSION_SCOPES)[number];

export interface PluginManifest {
  readonly plugin_id: string;
  readonly version: string;
  readonly nova_api_version_range: string;
  readonly display_name: string;
  readonly description: string;
  readonly provided_tools: readonly string[];
  readonly required_permissions: readonly string[];
  readonly optional_permissions?: readonly string[];
  readonly dependencies: readonly {
    readonly plugin_id: string;
    readonly version_range: string;
  }[];
  readonly entry_point: string;
}

export interface PluginPermissionReviewRequest {
  readonly plugin_id: string;
  readonly permission: string;
  readonly required: boolean;
}

export interface PluginProcess {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface PluginDisableOptions {
  readonly force?: boolean;
  readonly confirmDependents?: (
    dependentPluginIds: readonly string[],
  ) => Promise<boolean> | boolean;
}

export interface PluginManagerOptions {
  readonly novaApiVersion: string;
  readonly verify?: (manifest: PluginManifest) => Promise<boolean> | boolean;
  readonly sandbox?: (manifest: PluginManifest) => Promise<boolean> | boolean;
  readonly processFactory?: (manifest: PluginManifest) => PluginProcess;
  readonly deregisterTools?: (toolIds: readonly string[]) => Promise<void> | void;
  readonly reviewPermission?:
    ((request: PluginPermissionReviewRequest) => Promise<boolean> | boolean) | undefined;
  readonly logger?: StructuredLogger | undefined;
}

export type PluginState =
  "Installed" | "Enabled" | "Disabled" | "Updating" | "Failed" | "Deprecated" | "Uninstalled";

export interface PluginRecord {
  readonly manifest: PluginManifest;
  readonly state: PluginState;
  readonly granted_permissions: readonly string[];
}

export interface PluginRecordSummary {
  readonly plugin_id: string;
  readonly version: string;
  readonly state: PluginState;
  readonly provided_tool_count: number;
  readonly required_permission_count: number;
}

type MutablePluginRecord = {
  manifest: PluginManifest;
  state: PluginState;
  grantedPermissions: Set<string>;
  process?: PluginProcess | undefined;
};

const versionPattern = "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$";
const manifestSchema = z.object({
  plugin_id: z.string().min(1),
  version: z.string().regex(new RegExp(versionPattern)),
  nova_api_version_range: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string(),
  provided_tools: z.array(z.string().min(1)),
  required_permissions: z.array(z.string().min(1)),
  optional_permissions: z.array(z.string().min(1)).default([]),
  dependencies: z.array(
    z.object({
      plugin_id: z.string().min(1),
      version_range: z.string().min(1),
    }),
  ),
  entry_point: z.string().min(1),
});

interface Semver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function parseVersion(value: string): Semver | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(value.trim());
  if (!match) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersions(left: Semver, right: Semver): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function satisfiesRange(version: string, range: string): boolean {
  const parsedVersion = parseVersion(version);
  if (!parsedVersion) return false;
  const clauses = range.trim().split(/\s+/).filter(Boolean);
  if (clauses.length === 0) return false;

  return clauses.every((clause) => {
    const match = /^(>=|<=|>|<|=|~|\^)?(\d+\.\d+\.\d+)$/.exec(clause);
    if (!match) return false;
    const operator = match[1] ?? "=";
    const versionToken = match[2];
    if (!versionToken) return false;
    const target = parseVersion(versionToken);
    if (!target) return false;
    const comparison = compareVersions(parsedVersion, target);
    if (operator === ">=") return comparison >= 0;
    if (operator === "<=") return comparison <= 0;
    if (operator === ">") return comparison > 0;
    if (operator === "<") return comparison < 0;
    if (operator === "~") {
      return (
        comparison >= 0 &&
        parsedVersion.major === target.major &&
        parsedVersion.minor === target.minor
      );
    }
    if (operator === "^") {
      return comparison >= 0 && parsedVersion.major === target.major;
    }
    return comparison === 0;
  });
}

const configurationFailure = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-CFG001" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const dependencyFailure = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG001" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const pluginCrash = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG002" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const compatibilityFailure = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG004" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const lifecycleFailure = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG005" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const sandboxFailure = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG006" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const verificationFailure = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-SEC002" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const permissionMismatch = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG003" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const authorizationDenied = (
  message: string,
  details?: Readonly<Record<string, ErrorDetailValue>>,
): ErrorInfo => {
  const base = { code: "NOVA-SEC004" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const knownPermissionScopes = new Set<string>(PLUGIN_PERMISSION_SCOPES);

export class PluginManager {
  private readonly plugins = new Map<string, MutablePluginRecord>();
  private readonly options: Required<Pick<PluginManagerOptions, "novaApiVersion">> &
    PluginManagerOptions;

  public constructor(options: PluginManagerOptions) {
    this.options = options;
  }

  public install(input: PluginManifest): Result<PluginRecord> {
    const parsed = manifestSchema.safeParse(input);
    if (!parsed.success) {
      return err(
        configurationFailure("Plugin manifest is invalid.", {
          issueCount: parsed.error.issues.length,
        }),
      );
    }

    const optionalPermissions = input.optional_permissions ?? [];
    const declaredPermissions = [...input.required_permissions, ...optionalPermissions];
    const duplicatePermissions = declaredPermissions.filter(
      (permission, index) => declaredPermissions.indexOf(permission) !== index,
    );
    const invalidPermission = declaredPermissions.find(
      (permission) => !knownPermissionScopes.has(permission),
    );
    if (invalidPermission || duplicatePermissions.length > 0) {
      return err(
        configurationFailure("Plugin manifest declares invalid or duplicate permissions.", {
          invalidPermission: invalidPermission ?? "",
          duplicatePermission: duplicatePermissions[0] ?? "",
        }),
      );
    }
    if (this.plugins.has(input.plugin_id)) {
      return err(
        lifecycleFailure("A plugin with this identifier is already installed.", {
          pluginId: input.plugin_id,
        }),
      );
    }
    const manifest: PluginManifest = { ...input, optional_permissions: optionalPermissions };
    const record: MutablePluginRecord = {
      manifest,
      state: "Installed",
      grantedPermissions: new Set<string>(),
    };
    this.plugins.set(input.plugin_id, record);
    return ok(this.publicRecord(record));
  }

  public async enable(pluginId: string): Promise<Result<PluginRecord>> {
    const record = this.plugins.get(pluginId);
    if (!record) return err(lifecycleFailure("Plugin is not installed.", { pluginId }));
    if (record.state === "Enabled" || record.state === "Deprecated")
      return ok(this.publicRecord(record));
    if (record.state === "Uninstalled")
      return err(lifecycleFailure("Plugin has been uninstalled.", { pluginId }));

    const dependencyError = this.validateDependencies(pluginId, new Set<string>());
    if (dependencyError) {
      record.state = "Failed";
      return err(dependencyError);
    }
    if (!satisfiesRange(this.options.novaApiVersion, record.manifest.nova_api_version_range)) {
      record.state = "Failed";
      return err(
        compatibilityFailure("Plugin is incompatible with the running NOVA API version.", {
          pluginId,
          novaApiVersion: this.options.novaApiVersion,
          requiredRange: record.manifest.nova_api_version_range,
        }),
      );
    }

    try {
      if (this.options.verify && !(await this.options.verify(record.manifest))) {
        record.state = "Failed";
        return err(
          verificationFailure("Plugin verification failed before sandbox provisioning.", {
            pluginId,
          }),
        );
      }
      if (this.options.sandbox && !(await this.options.sandbox(record.manifest))) {
        record.state = "Failed";
        return err(
          sandboxFailure("Plugin sandbox provisioning failed before code loading.", { pluginId }),
        );
      }

      record.process = (
        this.options.processFactory ??
        (() => ({
          start: async () => undefined,
          stop: async () => undefined,
        }))
      )(record.manifest);
      await record.process.start();
      record.grantedPermissions = await this.reviewDeclaredPermissions(record.manifest);
      record.state = "Enabled";
      return ok(this.publicRecord(record));
    } catch (cause) {
      record.state = "Failed";
      return err(
        pluginCrash("Plugin process failed during enablement.", {
          pluginId,
          cause: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
  }

  public authorizeToolInvocation(
    pluginId: string,
    toolId: string,
    permissionScope: string,
  ): Result<void> {
    const record = this.plugins.get(pluginId);
    if (!record || (record.state !== "Enabled" && record.state !== "Deprecated")) {
      return err(
        permissionMismatch(
          "Plugin tool invocation is unavailable because the plugin is not enabled.",
          { pluginId, toolId },
        ),
      );
    }
    if (!record.manifest.provided_tools.includes(toolId)) {
      this.options.logger?.warning("plugin.invocation.blocked", {
        plugin_id: pluginId,
        tool_id: toolId,
        reason: "tool_not_declared",
      });
      return err(
        permissionMismatch("Plugin attempted to invoke a tool outside its declared manifest.", {
          pluginId,
          toolId,
        }),
      );
    }
    const declaredPermissions = [
      ...record.manifest.required_permissions,
      ...(record.manifest.optional_permissions ?? []),
    ];
    if (!declaredPermissions.includes(permissionScope)) {
      this.options.logger?.warning("plugin.invocation.blocked", {
        plugin_id: pluginId,
        tool_id: toolId,
        permission_scope: permissionScope,
        reason: "permission_not_declared",
      });
      return err(
        permissionMismatch(
          "Plugin attempted to access a permission outside its declared manifest.",
          {
            pluginId,
            toolId,
            permissionScope,
          },
        ),
      );
    }
    if (!record.grantedPermissions.has(permissionScope)) {
      this.options.logger?.warning("plugin.invocation.blocked", {
        plugin_id: pluginId,
        tool_id: toolId,
        permission_scope: permissionScope,
        reason: "permission_not_granted",
      });
      return err(
        authorizationDenied(
          "Plugin tool invocation is outside the currently granted permission scope.",
          { pluginId, toolId, permissionScope },
        ),
      );
    }
    return ok(undefined);
  }

  public revokePermission(pluginId: string, permissionScope: string): Result<PluginRecord> {
    const record = this.plugins.get(pluginId);
    if (!record) return err(lifecycleFailure("Plugin is not installed.", { pluginId }));
    const optionalPermissions = record.manifest.optional_permissions ?? [];
    if (
      !record.manifest.required_permissions.includes(permissionScope) &&
      !optionalPermissions.includes(permissionScope)
    ) {
      return err(
        permissionMismatch("Permission is not declared by the plugin manifest.", {
          pluginId,
          permissionScope,
        }),
      );
    }
    record.grantedPermissions.delete(permissionScope);
    this.options.logger?.info("plugin.permission.revoked", {
      plugin_id: pluginId,
      permission_scope: permissionScope,
    });
    return ok(this.publicRecord(record));
  }

  public async disable(
    pluginId: string,
    options: PluginDisableOptions = {},
  ): Promise<Result<PluginRecord>> {
    const record = this.plugins.get(pluginId);
    if (!record) return err(lifecycleFailure("Plugin is not installed.", { pluginId }));
    if (record.state === "Disabled" || record.state === "Failed")
      return ok(this.publicRecord(record));
    if (record.state === "Uninstalled")
      return err(lifecycleFailure("Plugin has been uninstalled.", { pluginId }));

    const dependentPluginIds = this.enabledDependents(pluginId);
    if (dependentPluginIds.length > 0) {
      const confirmed =
        options.force === true && options.confirmDependents !== undefined
          ? await options.confirmDependents(dependentPluginIds)
          : false;
      if (!confirmed) {
        this.options.logger?.warning("plugin.disable.blocked", {
          plugin_id: pluginId,
          dependent_count: dependentPluginIds.length,
          reason: options.force === true ? "cascade_not_confirmed" : "enabled_dependents",
        });
        return err(
          lifecycleFailure(
            "Plugin has enabled dependents and requires an explicit cascade confirmation.",
            {
              pluginId,
              dependent_plugin_ids: dependentPluginIds,
            },
          ),
        );
      }
      this.options.logger?.info("plugin.disable.cascade_confirmed", {
        plugin_id: pluginId,
        dependent_count: dependentPluginIds.length,
      });
      for (const dependentPluginId of [...dependentPluginIds].reverse()) {
        const disabled = await this.disable(dependentPluginId, {
          force: true,
          confirmDependents: () => true,
        });
        if (!disabled.ok) return err(disabled.error);
      }
    }

    return this.disableSingle(record);
  }

  public async uninstall(
    pluginId: string,
    options: PluginDisableOptions = {},
  ): Promise<Result<void>> {
    const record = this.plugins.get(pluginId);
    if (!record) return err(lifecycleFailure("Plugin is not installed.", { pluginId }));
    if (record.state === "Enabled" || record.state === "Deprecated") {
      const disabled = await this.disable(pluginId, options);
      if (!disabled.ok) return err(disabled.error);
    }
    if (record.state !== "Disabled" && record.state !== "Failed") {
      return err(
        lifecycleFailure("Plugin must be disabled before uninstalling.", {
          pluginId,
          state: record.state,
        }),
      );
    }
    record.state = "Uninstalled";
    this.plugins.delete(pluginId);
    return ok(undefined);
  }

  private async disableSingle(record: MutablePluginRecord): Promise<Result<PluginRecord>> {
    try {
      if (record.process) await record.process.stop();
      await this.options.deregisterTools?.(record.manifest.provided_tools);
      record.process = undefined;
      record.grantedPermissions.clear();
      record.state = "Disabled";
      return ok(this.publicRecord(record));
    } catch (cause) {
      record.state = "Failed";
      return err(
        pluginCrash("Plugin process failed while disabling.", {
          pluginId: record.manifest.plugin_id,
          cause: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
  }

  public get(pluginId: string): Result<PluginRecord> {
    const record = this.plugins.get(pluginId);
    return record
      ? ok(this.publicRecord(record))
      : err(lifecycleFailure("Plugin is not installed.", { pluginId }));
  }

  public listSummaries(): readonly PluginRecordSummary[] {
    return [...this.plugins.values()]
      .sort((left, right) => left.manifest.plugin_id.localeCompare(right.manifest.plugin_id))
      .slice(0, 128)
      .map((record) => ({
        plugin_id: record.manifest.plugin_id,
        version: record.manifest.version,
        state: record.state,
        provided_tool_count: record.manifest.provided_tools.length,
        required_permission_count: record.manifest.required_permissions.length,
      }));
  }

  private enabledDependents(pluginId: string): string[] {
    const dependentPluginIds = new Set<string>();
    const visit = (dependencyId: string): void => {
      for (const candidate of this.plugins.values()) {
        const isEnabled = candidate.state === "Enabled" || candidate.state === "Deprecated";
        const dependsOnTarget = candidate.manifest.dependencies.some(
          (dependency) => dependency.plugin_id === dependencyId,
        );
        if (isEnabled && dependsOnTarget && !dependentPluginIds.has(candidate.manifest.plugin_id)) {
          dependentPluginIds.add(candidate.manifest.plugin_id);
          visit(candidate.manifest.plugin_id);
        }
      }
    };
    visit(pluginId);
    return [...dependentPluginIds];
  }

  private async reviewDeclaredPermissions(manifest: PluginManifest): Promise<Set<string>> {
    const granted = new Set<string>();
    const review = this.options.reviewPermission ?? (() => false);
    const optionalPermissions = manifest.optional_permissions ?? [];

    for (const permission of manifest.required_permissions) {
      const approved = await review({
        plugin_id: manifest.plugin_id,
        permission,
        required: true,
      });
      this.options.logger?.info("plugin.permission.reviewed", {
        plugin_id: manifest.plugin_id,
        permission_scope: permission,
        required: true,
        granted: approved,
      });
      if (approved) granted.add(permission);
    }
    for (const permission of optionalPermissions) {
      const approved = await review({
        plugin_id: manifest.plugin_id,
        permission,
        required: false,
      });
      this.options.logger?.info("plugin.permission.reviewed", {
        plugin_id: manifest.plugin_id,
        permission_scope: permission,
        required: false,
        granted: approved,
      });
      if (approved) granted.add(permission);
    }
    return granted;
  }

  private validateDependencies(pluginId: string, visiting: Set<string>): ErrorInfo | undefined {
    if (visiting.has(pluginId)) {
      return dependencyFailure("Plugin dependency cycle detected.", { pluginId });
    }
    const record = this.plugins.get(pluginId);
    if (!record) return dependencyFailure("Plugin dependency is not installed.", { pluginId });
    visiting.add(pluginId);
    for (const dependency of record.manifest.dependencies) {
      const dependencyRecord = this.plugins.get(dependency.plugin_id);
      if (!dependencyRecord || dependencyRecord.state !== "Enabled") {
        return dependencyFailure("Plugin dependency is missing or not enabled.", {
          pluginId,
          dependencyId: dependency.plugin_id,
        });
      }
      if (!satisfiesRange(dependencyRecord.manifest.version, dependency.version_range)) {
        return dependencyFailure("Plugin dependency version is incompatible.", {
          pluginId,
          dependencyId: dependency.plugin_id,
          requiredRange: dependency.version_range,
        });
      }
      const cycleError = this.validateDependencies(dependency.plugin_id, visiting);
      if (cycleError) return cycleError;
    }
    visiting.delete(pluginId);
    return undefined;
  }

  private publicRecord(record: MutablePluginRecord): PluginRecord {
    return {
      manifest: record.manifest,
      state: record.state,
      granted_permissions: [...record.grantedPermissions],
    };
  }
}
