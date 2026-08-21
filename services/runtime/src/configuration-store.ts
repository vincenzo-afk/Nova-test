import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface NovaConfiguration {
  readonly schema_version: "1.0.0";
  readonly capabilities: Readonly<Record<string, unknown>>;
  readonly devices: readonly unknown[];
  readonly channels: readonly unknown[];
  readonly plugins: readonly unknown[];
  readonly mcp_servers: readonly unknown[];
  readonly routing_policies: Readonly<Record<string, unknown>>;
  readonly permissions: Readonly<Record<string, unknown>>;
  readonly voice: Readonly<Record<string, unknown>>;
  readonly personalization: Readonly<Record<string, unknown>>;
}

export type ConfigurationSection = keyof Omit<NovaConfiguration, "schema_version">;

export interface ConfigurationWarning {
  readonly section: string;
  readonly message: string;
}

export interface ImportResult {
  readonly warnings: readonly ConfigurationWarning[];
}

export interface ConfigurationStoreOptions {
  readonly initial: NovaConfiguration;
  readonly availableProviderIds?: ReadonlySet<string>;
}

type ConfigurationListener = (configuration: NovaConfiguration) => void;

const sectionNames: readonly ConfigurationSection[] = [
  "capabilities",
  "devices",
  "channels",
  "plugins",
  "mcp_servers",
  "routing_policies",
  "permissions",
  "voice",
  "personalization",
];

export class ConfigurationStore {
  private configuration: NovaConfiguration;
  private readonly listeners = new Set<ConfigurationListener>();
  private readonly availableProviderIds: ReadonlySet<string>;

  public constructor(options: ConfigurationStoreOptions) {
    this.availableProviderIds = options.availableProviderIds ?? new Set<string>();
    this.configuration = clone(options.initial);
  }

  public snapshot(): NovaConfiguration {
    return clone(this.configuration);
  }

  public subscribe(listener: ConfigurationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public update<TSection extends ConfigurationSection>(
    section: TSection,
    value: NovaConfiguration[TSection],
  ): Result<void> {
    const validation = this.validateSection(section, value);
    if (!validation.ok) return validation;
    this.configuration = { ...this.configuration, [section]: clone(value) } as NovaConfiguration;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
    return ok(undefined);
  }

  public export(): string {
    return JSON.stringify(this.configuration);
  }

  public import(serialized: string): Result<ImportResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      return err(this.configError("Configuration export is not valid JSON.", "document"));
    }
    const document = parsed as Partial<NovaConfiguration> | null;
    if (!document || document.schema_version !== "1.0.0") {
      return err(this.configError("Unsupported configuration schema version.", "schema_version"));
    }
    for (const section of sectionNames) {
      if (!(section in document))
        return err(this.configError("Configuration is missing a required section.", section));
    }

    let next = clone(document as NovaConfiguration);
    const warnings: ConfigurationWarning[] = [];
    const policies = next.routing_policies as Record<string, unknown>;
    const sanitizedPolicies: Record<string, unknown> = {};
    for (const [capabilityId, rawPolicy] of Object.entries(policies)) {
      const policy = rawPolicy as { policy?: unknown; manual_override?: unknown } | null;
      if (!policy || typeof policy.policy !== "string") {
        return err(
          this.configError("Routing policy is malformed.", `routing_policies.${capabilityId}`),
        );
      }
      if (policy.manual_override !== undefined && typeof policy.manual_override !== "string") {
        return err(
          this.configError(
            "Manual provider override must be a provider identifier.",
            `routing_policies.${capabilityId}.manual_override`,
          ),
        );
      }
      if (policy.manual_override && !this.availableProviderIds.has(policy.manual_override)) {
        warnings.push({
          section: "routing_policies",
          message: `Provider ${policy.manual_override} is unavailable on this device.`,
        });
      } else {
        sanitizedPolicies[capabilityId] = rawPolicy;
      }
    }
    next = { ...next, routing_policies: sanitizedPolicies };
    for (const section of sectionNames) {
      const validation = this.validateSection(section, next[section]);
      if (!validation.ok) return validation;
    }
    this.configuration = next;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
    return ok({ warnings });
  }

  private validateSection(section: ConfigurationSection, value: unknown): Result<void> {
    if (section === "routing_policies") {
      if (!isRecord(value))
        return err(this.configError("Routing policies must be an object.", section));
      for (const [capabilityId, rawPolicy] of Object.entries(value)) {
        if (
          !isRecord(rawPolicy) ||
          !["privacy-first", "latency-optimized", "cost-optimized", "manual"].includes(
            String(rawPolicy.policy),
          )
        ) {
          return err(
            this.configError(
              "Routing policy is invalid.",
              `routing_policies.${capabilityId}.policy`,
            ),
          );
        }
        if (rawPolicy.manual_override !== undefined) {
          if (typeof rawPolicy.manual_override !== "string")
            return err(
              this.configError(
                "Manual provider override must be a provider identifier.",
                `routing_policies.${capabilityId}.manual_override`,
              ),
            );
          if (!this.availableProviderIds.has(rawPolicy.manual_override))
            return err(
              this.configError(
                "Manual provider override references an unavailable provider.",
                `routing_policies.${capabilityId}.manual_override`,
              ),
            );
        }
      }
      return ok(undefined);
    }
    if (
      section === "channels" ||
      section === "plugins" ||
      section === "mcp_servers" ||
      section === "devices"
    ) {
      if (!Array.isArray(value))
        return err(this.configError(`${section} must be an array.`, section));
    } else if (!isRecord(value)) {
      return err(this.configError(`${section} must be an object.`, section));
    }
    if (containsInlineCredential(value))
      return err(
        this.configError(
          "Credential values must be vault references, never inline secrets.",
          section,
        ),
      );
    return ok(undefined);
  }

  private configError(message: string, field: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false, details: { field } };
  }
}

function containsInlineCredential(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsInlineCredential);
  if (!isRecord(value)) return false;
  for (const [key, nested] of Object.entries(value)) {
    if (["token", "api_key", "apiKey", "secret", "password", "credential_value"].includes(key))
      return true;
    if (key === "credential" && isRecord(nested) && !("vault_reference" in nested)) return true;
    if (containsInlineCredential(nested)) return true;
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
