import { z } from "zod";
import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface PluginManifest {
  readonly plugin_id: string;
  readonly version: string;
  readonly nova_api_version_range: string;
  readonly display_name: string;
  readonly description: string;
  readonly provided_tools: readonly string[];
  readonly required_permissions: readonly string[];
  readonly dependencies: readonly {
    readonly plugin_id: string;
    readonly version_range: string;
  }[];
  readonly entry_point: string;
}

export interface PluginProcess {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface PluginManagerOptions {
  readonly novaApiVersion: string;
  readonly verify?: (manifest: PluginManifest) => Promise<boolean> | boolean;
  readonly sandbox?: (manifest: PluginManifest) => Promise<boolean> | boolean;
  readonly processFactory?: (manifest: PluginManifest) => PluginProcess;
  readonly deregisterTools?: (toolIds: readonly string[]) => Promise<void> | void;
}

export type PluginState =
  "Installed" | "Enabled" | "Disabled" | "Updating" | "Failed" | "Deprecated" | "Uninstalled";

export interface PluginRecord {
  readonly manifest: PluginManifest;
  readonly state: PluginState;
}

type MutablePluginRecord = {
  manifest: PluginManifest;
  state: PluginState;
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

const failure = (
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG001" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

const compatibilityFailure = (
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
): ErrorInfo => {
  const base = { code: "NOVA-PLG002" as const, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

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
        failure("Plugin manifest is invalid.", { issueCount: parsed.error.issues.length }),
      );
    }
    if (this.plugins.has(input.plugin_id)) {
      return err(
        failure("A plugin with this identifier is already installed.", {
          pluginId: input.plugin_id,
        }),
      );
    }
    const record: MutablePluginRecord = { manifest: input, state: "Installed" };
    this.plugins.set(input.plugin_id, record);
    return ok(this.publicRecord(record));
  }

  public async enable(pluginId: string): Promise<Result<PluginRecord>> {
    const record = this.plugins.get(pluginId);
    if (!record) return err(failure("Plugin is not installed.", { pluginId }));
    if (record.state === "Enabled" || record.state === "Deprecated")
      return ok(this.publicRecord(record));
    if (record.state === "Uninstalled")
      return err(failure("Plugin has been uninstalled.", { pluginId }));

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
          failure("Plugin verification failed before sandbox provisioning.", { pluginId }),
        );
      }
      if (this.options.sandbox && !(await this.options.sandbox(record.manifest))) {
        record.state = "Failed";
        return err(
          failure("Plugin sandbox provisioning failed before code loading.", { pluginId }),
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
      record.state = "Enabled";
      return ok(this.publicRecord(record));
    } catch (cause) {
      record.state = "Failed";
      return err(
        failure("Plugin process failed during enablement.", {
          pluginId,
          cause: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
  }

  public async disable(pluginId: string): Promise<Result<PluginRecord>> {
    const record = this.plugins.get(pluginId);
    if (!record) return err(failure("Plugin is not installed.", { pluginId }));
    if (record.state === "Disabled" || record.state === "Failed")
      return ok(this.publicRecord(record));
    if (record.state === "Uninstalled")
      return err(failure("Plugin has been uninstalled.", { pluginId }));

    try {
      if (record.process) await record.process.stop();
      await this.options.deregisterTools?.(record.manifest.provided_tools);
      record.process = undefined;
      record.state = "Disabled";
      return ok(this.publicRecord(record));
    } catch (cause) {
      record.state = "Failed";
      return err(
        failure("Plugin process failed while disabling.", {
          pluginId,
          cause: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
  }

  public async uninstall(pluginId: string): Promise<Result<void>> {
    const record = this.plugins.get(pluginId);
    if (!record) return err(failure("Plugin is not installed.", { pluginId }));
    if (record.state === "Enabled" || record.state === "Deprecated") {
      const disabled = await this.disable(pluginId);
      if (!disabled.ok) return err(disabled.error);
    }
    if (record.state !== "Disabled" && record.state !== "Failed") {
      return err(
        failure("Plugin must be disabled before uninstalling.", { pluginId, state: record.state }),
      );
    }
    record.state = "Uninstalled";
    this.plugins.delete(pluginId);
    return ok(undefined);
  }

  public get(pluginId: string): Result<PluginRecord> {
    const record = this.plugins.get(pluginId);
    return record
      ? ok(this.publicRecord(record))
      : err(failure("Plugin is not installed.", { pluginId }));
  }

  private validateDependencies(pluginId: string, visiting: Set<string>): ErrorInfo | undefined {
    if (visiting.has(pluginId)) {
      return compatibilityFailure("Plugin dependency cycle detected.", { pluginId });
    }
    const record = this.plugins.get(pluginId);
    if (!record) return compatibilityFailure("Plugin dependency is not installed.", { pluginId });
    visiting.add(pluginId);
    for (const dependency of record.manifest.dependencies) {
      const dependencyRecord = this.plugins.get(dependency.plugin_id);
      if (!dependencyRecord || dependencyRecord.state !== "Enabled") {
        return compatibilityFailure("Plugin dependency is missing or not enabled.", {
          pluginId,
          dependencyId: dependency.plugin_id,
        });
      }
      if (!satisfiesRange(dependencyRecord.manifest.version, dependency.version_range)) {
        return compatibilityFailure("Plugin dependency version is incompatible.", {
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
    return { manifest: record.manifest, state: record.state };
  }
}
