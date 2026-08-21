import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type CapabilityDomain =
  | "llm"
  | "vision"
  | "speech-to-text"
  | "text-to-speech"
  | "embeddings"
  | "ocr"
  | "reranking"
  | "messaging-channel"
  | "remote-control";
export type ProviderPrivacyClass = "local" | "cloud";
export type ProviderHealth = "reachable" | "degraded" | "down";
export type RoutingPolicy = "privacy-first" | "latency-optimized" | "cost-optimized" | "manual";

export interface ProviderDescriptor {
  readonly provider_id: string;
  readonly domain: CapabilityDomain;
  readonly privacy_class: ProviderPrivacyClass;
  readonly schema_version: string;
  readonly capabilities: readonly string[];
  readonly cost_per_request: number;
  readonly latency_p50_ms: number;
}

export interface Provider {
  readonly descriptor: ProviderDescriptor;
  readonly healthCheck: () => Promise<ProviderHealth>;
  readonly invoke: (request: Readonly<Record<string, unknown>>) => Promise<unknown>;
  readonly cancel: (requestId: string) => void;
  readonly shutdown: () => void;
}

export interface CapabilityPolicy {
  readonly policy: RoutingPolicy;
  readonly manual_override?: string;
}

export interface CapabilityProviderEntry {
  readonly provider_id: string;
  readonly enabled: boolean;
  readonly priority: number;
}

export type CapabilityState = "Unconfigured" | "Configured, disabled" | "Active" | "Degraded";

export interface CapabilityRecord {
  readonly capability_id: string;
  readonly domain: CapabilityDomain;
  readonly providers: readonly CapabilityProviderEntry[];
  readonly active_policy: CapabilityPolicy;
  readonly state: CapabilityState;
}

export interface ProviderRequest {
  readonly required_schema_version?: string;
  readonly required_capabilities?: readonly string[];
  readonly provider_hint?: string;
}

export interface RoutingElimination {
  readonly provider_id: string;
  readonly reason: string;
}

export interface RoutingDecision {
  readonly capability_id: string;
  readonly candidates: readonly string[];
  readonly eliminated: readonly RoutingElimination[];
  readonly final_provider_id: string | null;
}

interface MutableCapabilityRecord {
  readonly capability_id: string;
  readonly domain: CapabilityDomain;
  readonly providers: Map<string, CapabilityProviderEntry>;
  active_policy: CapabilityPolicy;
  state: CapabilityState;
}

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, MutableCapabilityRecord>();
  private readonly providers = new Map<string, Provider>();

  public register(capabilityId: string, provider: Provider): Result<CapabilityRecord> {
    if (this.providers.has(provider.descriptor.provider_id)) {
      return err(
        this.failure("Provider is already registered.", {
          providerId: provider.descriptor.provider_id,
        }),
      );
    }
    let record = this.capabilities.get(capabilityId);
    if (!record) {
      record = {
        capability_id: capabilityId,
        domain: provider.descriptor.domain,
        providers: new Map(),
        active_policy: { policy: "privacy-first" },
        state: "Unconfigured",
      };
      this.capabilities.set(capabilityId, record);
    }
    if (record.domain !== provider.descriptor.domain) {
      return err(
        this.failure("Provider domain does not match the capability domain.", { capabilityId }),
      );
    }
    record.providers.set(provider.descriptor.provider_id, {
      provider_id: provider.descriptor.provider_id,
      enabled: true,
      priority: record.providers.size + 1,
    });
    this.providers.set(provider.descriptor.provider_id, provider);
    record.state = "Active";
    return ok(this.publicRecord(record));
  }

  public setEnabled(
    capabilityId: string,
    providerId: string,
    enabled: boolean,
  ): Result<CapabilityRecord> {
    const record = this.capabilities.get(capabilityId);
    const entry = record?.providers.get(providerId);
    if (!record || !entry)
      return err(
        this.failure("Capability provider is not registered.", { capabilityId, providerId }),
      );
    record.providers.set(providerId, { ...entry, enabled });
    record.state = this.stateFor(record);
    return ok(this.publicRecord(record));
  }

  public setPolicy(capabilityId: string, policy: CapabilityPolicy): Result<CapabilityRecord> {
    const record = this.capabilities.get(capabilityId);
    if (!record) return err(this.failure("Capability is not registered.", { capabilityId }));
    record.active_policy = policy;
    return ok(this.publicRecord(record));
  }

  public remove(providerId: string): Result<void> {
    const provider = this.providers.get(providerId);
    if (!provider) return err(this.failure("Provider is not registered.", { providerId }));
    provider.shutdown();
    this.providers.delete(providerId);
    for (const record of this.capabilities.values()) {
      if (record.providers.delete(providerId)) record.state = this.stateFor(record);
    }
    return ok(undefined);
  }

  public get(capabilityId: string): Result<CapabilityRecord> {
    const record = this.capabilities.get(capabilityId);
    return record
      ? ok(this.publicRecord(record))
      : err(this.failure("Capability is not registered.", { capabilityId }));
  }

  public provider(capabilityId: string, providerId: string): Provider | undefined {
    const record = this.capabilities.get(capabilityId);
    const entry = record?.providers.get(providerId);
    return entry?.enabled ? this.providers.get(providerId) : undefined;
  }

  public entries(
    capabilityId: string,
  ): readonly { provider: Provider; entry: CapabilityProviderEntry }[] {
    const record = this.capabilities.get(capabilityId);
    if (!record) return [];
    return [...record.providers.values()]
      .map((entry) => ({ provider: this.providers.get(entry.provider_id), entry }))
      .filter(
        (item): item is { provider: Provider; entry: CapabilityProviderEntry } =>
          item.provider !== undefined,
      );
  }

  private stateFor(record: MutableCapabilityRecord): CapabilityState {
    return [...record.providers.values()].some((entry) => entry.enabled)
      ? "Active"
      : "Configured, disabled";
  }

  private publicRecord(record: MutableCapabilityRecord): CapabilityRecord {
    return {
      capability_id: record.capability_id,
      domain: record.domain,
      providers: [...record.providers.values()].sort(
        (left, right) => left.priority - right.priority,
      ),
      active_policy: record.active_policy,
      state: record.state,
    };
  }

  private failure(
    message: string,
    details: Readonly<Record<string, string | number | boolean>>,
  ): ErrorInfo {
    return { code: "NOVA-AI002", message, retryable: false, details };
  }
}

export class ProviderRouter {
  private readonly routingLog: RoutingDecision[] = [];

  public constructor(private readonly registry: CapabilityRegistry) {}

  public async select(capabilityId: string, request: ProviderRequest): Promise<Result<Provider>> {
    const record = this.registry.get(capabilityId);
    if (!record.ok) return record;
    const entries = this.registry.entries(capabilityId).filter(({ entry }) => entry.enabled);
    const eliminated: RoutingElimination[] = [];
    const healthy: { provider: Provider; priority: number; health: ProviderHealth }[] = [];

    for (const { provider, entry } of entries) {
      if (request.provider_hint && provider.descriptor.provider_id !== request.provider_hint) {
        eliminated.push({ provider_id: provider.descriptor.provider_id, reason: "provider_hint" });
        continue;
      }
      if (
        request.required_schema_version &&
        compareVersion(provider.descriptor.schema_version, request.required_schema_version) < 0
      ) {
        eliminated.push({ provider_id: provider.descriptor.provider_id, reason: "schema_version" });
        continue;
      }
      if (
        (request.required_capabilities ?? []).some(
          (capability) => !provider.descriptor.capabilities.includes(capability),
        )
      ) {
        eliminated.push({
          provider_id: provider.descriptor.provider_id,
          reason: "missing_capability",
        });
        continue;
      }
      const health = await provider.healthCheck();
      if (health === "down") {
        eliminated.push({ provider_id: provider.descriptor.provider_id, reason: "down" });
        continue;
      }
      healthy.push({ provider, priority: entry.priority, health });
    }

    const ordered = this.order(record.value.active_policy, healthy);
    const selected = ordered[0]?.provider ?? null;
    this.routingLog.push({
      capability_id: capabilityId,
      candidates: entries.map(({ provider }) => provider.descriptor.provider_id),
      eliminated,
      final_provider_id: selected?.descriptor.provider_id ?? null,
    });
    if (!selected)
      return err({
        code: "NOVA-AI001",
        message: "No enabled provider satisfies the capability request.",
        retryable: false,
      });
    return ok(selected);
  }

  public async invoke(
    capabilityId: string,
    request: Readonly<Record<string, unknown>>,
    constraints: ProviderRequest = {},
  ): Promise<Result<{ provider_id: string; response: unknown }>> {
    const initial = await this.select(capabilityId, constraints);
    if (!initial.ok) return initial;
    const candidates = await this.orderedCandidates(capabilityId, constraints);
    for (const provider of candidates) {
      try {
        return ok({
          provider_id: provider.descriptor.provider_id,
          response: await provider.invoke(request),
        });
      } catch {
        continue;
      }
    }
    return err({
      code: "NOVA-AI002",
      message: "All eligible providers failed during invocation.",
      retryable: true,
    });
  }

  public decisions(): readonly RoutingDecision[] {
    return this.routingLog;
  }

  private async orderedCandidates(
    capabilityId: string,
    request: ProviderRequest,
  ): Promise<readonly Provider[]> {
    const record = this.registry.get(capabilityId);
    if (!record.ok) return [];
    const entries = this.registry.entries(capabilityId).filter(({ entry }) => entry.enabled);
    const healthy: { provider: Provider; priority: number; health: ProviderHealth }[] = [];
    for (const { provider, entry } of entries) {
      if (request.provider_hint && provider.descriptor.provider_id !== request.provider_hint)
        continue;
      if (
        request.required_schema_version &&
        compareVersion(provider.descriptor.schema_version, request.required_schema_version) < 0
      )
        continue;
      if (
        (request.required_capabilities ?? []).some(
          (capability) => !provider.descriptor.capabilities.includes(capability),
        )
      )
        continue;
      const health = await provider.healthCheck();
      if (health !== "down") healthy.push({ provider, priority: entry.priority, health });
    }
    return this.order(record.value.active_policy, healthy).map((item) => item.provider);
  }

  private order(
    policy: CapabilityPolicy,
    providers: readonly { provider: Provider; priority: number; health: ProviderHealth }[],
  ): readonly { provider: Provider; priority: number; health: ProviderHealth }[] {
    const sorted = [...providers];
    if (policy.policy === "manual" && policy.manual_override) {
      sorted.sort(
        (left, right) =>
          Number(right.provider.descriptor.provider_id === policy.manual_override) -
          Number(left.provider.descriptor.provider_id === policy.manual_override),
      );
      return sorted;
    }
    if (policy.policy === "privacy-first") {
      sorted.sort(
        (left, right) =>
          Number(right.provider.descriptor.privacy_class === "local") -
            Number(left.provider.descriptor.privacy_class === "local") ||
          left.priority - right.priority,
      );
    } else if (policy.policy === "latency-optimized") {
      sorted.sort(
        (left, right) =>
          left.provider.descriptor.latency_p50_ms - right.provider.descriptor.latency_p50_ms,
      );
    } else if (policy.policy === "cost-optimized") {
      sorted.sort(
        (left, right) =>
          left.provider.descriptor.cost_per_request - right.provider.descriptor.cost_per_request,
      );
    } else {
      sorted.sort((left, right) => left.priority - right.priority);
    }
    return sorted;
  }
}

const compareVersion = (left: string, right: string): number => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};
