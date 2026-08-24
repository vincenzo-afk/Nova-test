import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";

export type ConfiguredRoutingPolicy =
  "privacy-first" | "latency-optimized" | "cost-optimized" | "manual";

export type PersonalizationCategory =
  "tool-default" | "provider-default" | "proactive-timing" | "routing-preference" | "tone";

export interface CapabilityProviderRecord {
  readonly provider_id: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly credential?: { readonly vault_reference: string };
}

export interface ConfiguredCapabilityRecord {
  readonly capability_id: string;
  readonly domain: string;
  readonly required: boolean;
  readonly providers: readonly CapabilityProviderRecord[];
  readonly active_policy: ConfiguredRoutingPolicy;
  readonly manual_override: string | null;
}

export type CapabilityRegistryConfiguration = Readonly<Record<string, ConfiguredCapabilityRecord>>;

export interface PersonalizationPreferenceRecord {
  readonly id: string;
  readonly category: PersonalizationCategory;
  readonly value: unknown;
  readonly enabled: boolean;
  readonly source: "user" | "feedback";
  readonly updated_at: string;
}

export interface PersonalizationConfiguration {
  readonly preferences: readonly PersonalizationPreferenceRecord[];
}

export interface NovaConfiguration {
  readonly schema_version: "1.0.0";
  readonly capabilities: CapabilityRegistryConfiguration;
  readonly devices: readonly unknown[];
  readonly channels: readonly unknown[];
  readonly plugins: readonly unknown[];
  readonly mcp_servers: readonly unknown[];
  readonly routing_policies: Readonly<Record<string, unknown>>;
  readonly permissions: Readonly<Record<string, unknown>> & {
    readonly browser_excluded_domains?: readonly string[];
  };
  readonly voice: Readonly<Record<string, unknown>>;
  readonly personalization: PersonalizationConfiguration;
}

export type ConfigurationSectionName = keyof Omit<NovaConfiguration, "schema_version">;
type ConfigurationSection = ConfigurationSectionName;

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
  readonly logger?: StructuredLogger;
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
  private readonly logger: StructuredLogger | undefined;

  public constructor(options: ConfigurationStoreOptions) {
    this.availableProviderIds = options.availableProviderIds ?? new Set<string>();
    this.configuration = clone(options.initial);
    this.logger = options.logger;
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
    if (!validation.ok) {
      this.logger?.warning("configuration.update.rejected", {
        section,
        error_code: validation.error.code,
      });
      return validation;
    }
    this.configuration = { ...this.configuration, [section]: clone(value) } as NovaConfiguration;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
    this.logger?.info("configuration.updated", { section });
    return ok(undefined);
  }

  public resetPersonalization(preferenceId?: string): Result<void> {
    const current = this.configuration.personalization.preferences;
    const preferences = preferenceId
      ? current.filter((preference) => preference.id !== preferenceId)
      : [];
    const result = this.update("personalization", { preferences });
    if (result.ok) {
      this.logger?.info("configuration.personalization.reset", {
        scope: preferenceId === undefined ? "all" : "single",
      });
    }
    return result;
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
    this.logger?.info("configuration.imported", {
      schema_version: next.schema_version,
      warning_count: warnings.length,
    });
    return ok({ warnings });
  }

  private validateSection(section: ConfigurationSection, value: unknown): Result<void> {
    if (containsInlineCredential(value))
      return err(
        this.configError(
          "Credential values must be vault references, never inline secrets.",
          section,
        ),
      );
    if (section === "capabilities") return this.validateCapabilities(value);
    if (section === "personalization") return this.validatePersonalization(value);
    if (section === "permissions") return this.validatePermissions(value);
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
    return ok(undefined);
  }

  private validatePermissions(value: unknown): Result<void> {
    if (!isRecord(value))
      return err(this.configError("Permissions must be an object.", "permissions"));
    const domains = value.browser_excluded_domains;
    if (domains === undefined) return ok(undefined);
    if (!Array.isArray(domains))
      return err(
        this.configError(
          "Browser excluded domains must be an array.",
          "permissions.browser_excluded_domains",
        ),
      );
    for (const [index, rawDomain] of domains.entries()) {
      if (typeof rawDomain !== "string" || !isValidBrowserDomainRule(rawDomain))
        return err(
          this.configError(
            "Browser excluded domain must be a hostname or *.hostname wildcard.",
            `permissions.browser_excluded_domains.${index}`,
          ),
        );
    }
    return ok(undefined);
  }

  private validateCapabilities(value: unknown): Result<void> {
    if (!isRecord(value))
      return err(this.configError("Capabilities must be an object.", "capabilities"));
    for (const [capabilityId, rawCapability] of Object.entries(value)) {
      if (!isRecord(rawCapability))
        return err(
          this.configError("Capability record must be an object.", `capabilities.${capabilityId}`),
        );
      if (rawCapability.capability_id !== capabilityId)
        return err(
          this.configError(
            "Capability record id must match its configuration key.",
            `capabilities.${capabilityId}.capability_id`,
          ),
        );
      if (typeof rawCapability.domain !== "string" || rawCapability.domain.length === 0)
        return err(
          this.configError("Capability domain is required.", `capabilities.${capabilityId}.domain`),
        );
      if (typeof rawCapability.required !== "boolean")
        return err(
          this.configError(
            "Capability required must be boolean.",
            `capabilities.${capabilityId}.required`,
          ),
        );
      if (!Array.isArray(rawCapability.providers))
        return err(
          this.configError(
            "Capability providers must be an array.",
            `capabilities.${capabilityId}.providers`,
          ),
        );
      for (const [index, rawProvider] of rawCapability.providers.entries()) {
        if (!isRecord(rawProvider))
          return err(
            this.configError(
              "Provider record must be an object.",
              `capabilities.${capabilityId}.providers.${index}`,
            ),
          );
        if (typeof rawProvider.provider_id !== "string" || rawProvider.provider_id.length === 0)
          return err(
            this.configError(
              "Provider id is required.",
              `capabilities.${capabilityId}.providers.${index}.provider_id`,
            ),
          );
        if (typeof rawProvider.enabled !== "boolean")
          return err(
            this.configError(
              "Provider enabled must be boolean.",
              `capabilities.${capabilityId}.providers.${index}.enabled`,
            ),
          );
        if (
          typeof rawProvider.priority !== "number" ||
          !Number.isInteger(rawProvider.priority) ||
          rawProvider.priority < 1
        )
          return err(
            this.configError(
              "Provider priority must be a positive integer.",
              `capabilities.${capabilityId}.providers.${index}.priority`,
            ),
          );
        if (rawProvider.credential !== undefined) {
          if (
            !isRecord(rawProvider.credential) ||
            typeof rawProvider.credential.vault_reference !== "string" ||
            rawProvider.credential.vault_reference.length === 0
          )
            return err(
              this.configError(
                "Provider credentials must contain a vault reference.",
                `capabilities.${capabilityId}.providers.${index}.credential`,
              ),
            );
        }
      }
      if (!isRoutingPolicy(rawCapability.active_policy))
        return err(
          this.configError(
            "Capability active policy is invalid.",
            `capabilities.${capabilityId}.active_policy`,
          ),
        );
      if (
        rawCapability.manual_override !== null &&
        typeof rawCapability.manual_override !== "string"
      )
        return err(
          this.configError(
            "Capability manual override must be a provider identifier or null.",
            `capabilities.${capabilityId}.manual_override`,
          ),
        );
      if (
        typeof rawCapability.manual_override === "string" &&
        !this.availableProviderIds.has(rawCapability.manual_override)
      )
        return err(
          this.configError(
            "Capability manual override references an unavailable provider.",
            `capabilities.${capabilityId}.manual_override`,
          ),
        );
    }
    return ok(undefined);
  }

  private validatePersonalization(value: unknown): Result<void> {
    if (!isRecord(value) || !Array.isArray(value.preferences))
      return err(
        this.configError(
          "Personalization must contain a preferences array.",
          "personalization.preferences",
        ),
      );
    const ids = new Set<string>();
    for (const [index, preference] of value.preferences.entries()) {
      if (!isRecord(preference))
        return err(
          this.configError(
            "Personalization preference must be an object.",
            `personalization.preferences.${index}`,
          ),
        );
      if (typeof preference.id !== "string" || preference.id.length === 0 || ids.has(preference.id))
        return err(
          this.configError(
            "Personalization preference id must be non-empty and unique.",
            `personalization.preferences.${index}.id`,
          ),
        );
      ids.add(preference.id);
      if (!isPersonalizationCategory(preference.category))
        return err(
          this.configError(
            "Personalization preference category is invalid.",
            `personalization.preferences.${index}.category`,
          ),
        );
      if (typeof preference.enabled !== "boolean")
        return err(
          this.configError(
            "Personalization preference enabled must be boolean.",
            `personalization.preferences.${index}.enabled`,
          ),
        );
      if (preference.source !== "user" && preference.source !== "feedback")
        return err(
          this.configError(
            "Personalization preference source is invalid.",
            `personalization.preferences.${index}.source`,
          ),
        );
      if (
        typeof preference.updated_at !== "string" ||
        Number.isNaN(Date.parse(preference.updated_at))
      )
        return err(
          this.configError(
            "Personalization preference updated_at must be a date string.",
            `personalization.preferences.${index}.updated_at`,
          ),
        );
    }
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

function isValidBrowserDomainRule(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  const hostname = normalized.startsWith("*.") ? normalized.slice(2) : normalized;
  if (!hostname || hostname.length > 253 || hostname.includes("..")) return false;
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(hostname)) return false;
  return hostname
    .split(".")
    .every((label) => label.length <= 63 && !label.startsWith("-") && !label.endsWith("-"));
}

function isRoutingPolicy(value: unknown): value is ConfiguredRoutingPolicy {
  return ["privacy-first", "latency-optimized", "cost-optimized", "manual"].includes(String(value));
}

function isPersonalizationCategory(value: unknown): value is PersonalizationCategory {
  return [
    "tool-default",
    "provider-default",
    "proactive-timing",
    "routing-preference",
    "tone",
  ].includes(String(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
