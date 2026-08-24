import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { StructuredLogger } from "@nova/shared";
import type { HardwareProfile, HardwareTier } from "./hardware-detection.js";

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
  readonly minimum_hardware_tier?: HardwareTier;
}

export type ProviderAvailability = "recommended" | "available-but-unrecommended";

export interface ProviderRecommendation {
  readonly capability_id: string;
  readonly provider_id: string;
  readonly domain: CapabilityDomain;
  readonly privacy_class: ProviderPrivacyClass;
  readonly availability: ProviderAvailability;
  readonly reason: string;
  readonly minimum_hardware_tier?: HardwareTier;
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

const STREAMING_CAPABILITY = "streaming";
const MAX_ROUTING_LOG_PROVIDERS = 32;

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
  readonly health: Map<string, ProviderHealth>;
  active_policy: CapabilityPolicy;
  state: CapabilityState;
}

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, MutableCapabilityRecord>();
  private readonly providers = new Map<string, Provider>();
  private readonly logger: StructuredLogger | undefined;

  public constructor(logger?: StructuredLogger) {
    this.logger = logger;
  }

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
        health: new Map(),
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
    record.health.set(provider.descriptor.provider_id, "reachable");
    this.providers.set(provider.descriptor.provider_id, provider);
    record.state = this.stateFor(record);
    this.logger?.info("provider.registered", {
      capability_id: capabilityId,
      provider_id: provider.descriptor.provider_id,
      privacy_class: provider.descriptor.privacy_class,
    });
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
    this.logger?.info("provider.enabled.updated", {
      capability_id: capabilityId,
      provider_id: providerId,
      previous_enabled: entry.enabled,
      enabled,
    });
    return ok(this.publicRecord(record));
  }

  public setPriority(
    capabilityId: string,
    providerId: string,
    priority: number,
  ): Result<CapabilityRecord> {
    const record = this.capabilities.get(capabilityId);
    const entry = record?.providers.get(providerId);
    if (!record || !entry) {
      return err(
        this.failure("Capability provider is not registered.", { capabilityId, providerId }),
      );
    }
    if (!Number.isInteger(priority) || priority < 0) {
      return err(this.failure("Provider priority must be a non-negative integer.", { priority }));
    }
    const entries = [...record.providers.values()].filter(
      (candidate) => candidate.provider_id !== providerId,
    );
    const targetPosition = Math.min(priority, entries.length);
    entries.splice(targetPosition, 0, entry);
    entries.forEach((candidate, index) => {
      record.providers.set(candidate.provider_id, { ...candidate, priority: index });
    });
    this.logger?.info("provider.priority.updated", {
      capability_id: capabilityId,
      provider_id: providerId,
      previous_priority: entry.priority,
      priority: targetPosition,
    });
    return ok(this.publicRecord(record));
  }

  public updateHealth(
    capabilityId: string,
    providerId: string,
    health: ProviderHealth,
  ): Result<CapabilityRecord> {
    const record = this.capabilities.get(capabilityId);
    const entry = record?.providers.get(providerId);
    if (!record || !entry) {
      return err(
        this.failure("Capability provider is not registered.", { capabilityId, providerId }),
      );
    }
    const previousHealth = record.health.get(providerId) ?? "reachable";
    record.health.set(providerId, health);
    record.state = this.stateFor(record);
    if (health !== "reachable" && previousHealth !== health) {
      this.logger?.warning("provider.health.demoted", {
        capability_id: capabilityId,
        provider_id: providerId,
        previous_health: previousHealth,
        health,
      });
    } else if (health === "reachable" && previousHealth !== health) {
      this.logger?.info("provider.health.recovered", {
        capability_id: capabilityId,
        provider_id: providerId,
        previous_health: previousHealth,
        health,
      });
    }
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
      if (record.providers.delete(providerId)) {
        record.health.delete(providerId);
        record.state = this.stateFor(record);
      }
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

  public recommendations(
    capabilityId: string,
    hardware: HardwareProfile,
  ): readonly ProviderRecommendation[] {
    const record = this.capabilities.get(capabilityId);
    if (!record) return [];

    const recommendations = this.entries(capabilityId).map(({ provider }) => {
      const minimumTier = provider.descriptor.minimum_hardware_tier;
      const hardwareMeetsTier =
        provider.descriptor.privacy_class === "cloud" ||
        minimumTier === undefined ||
        tierRank(hardware.overall_tier) >= tierRank(minimumTier);
      const availability: ProviderAvailability = hardwareMeetsTier
        ? "recommended"
        : "available-but-unrecommended";
      const reason =
        provider.descriptor.privacy_class === "cloud"
          ? "cloud_provider_available"
          : minimumTier === undefined
            ? "hardware_requirement_not_declared"
            : hardwareMeetsTier
              ? "hardware_meets_minimum_tier"
              : "hardware_below_minimum_tier";
      return {
        capability_id: capabilityId,
        provider_id: provider.descriptor.provider_id,
        domain: provider.descriptor.domain,
        privacy_class: provider.descriptor.privacy_class,
        availability,
        reason,
        ...(minimumTier === undefined ? {} : { minimum_hardware_tier: minimumTier }),
      } satisfies ProviderRecommendation;
    });

    this.logger?.info("provider.recommendations.generated", {
      capability_id: capabilityId,
      hardware_tier: hardware.overall_tier,
      provider_count: recommendations.length,
      recommended_count: recommendations.filter(
        ({ availability }) => availability === "recommended",
      ).length,
    });
    return recommendations;
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
    const enabled = [...record.providers.values()].filter((entry) => entry.enabled);
    if (enabled.length === 0) return "Configured, disabled";
    return enabled.some((entry) => record.health.get(entry.provider_id) !== "reachable")
      ? "Degraded"
      : "Active";
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

  public constructor(
    private readonly registry: CapabilityRegistry,
    private readonly logger?: StructuredLogger,
  ) {}

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
      this.registry.updateHealth(capabilityId, provider.descriptor.provider_id, health);
      if (health === "down") {
        eliminated.push({ provider_id: provider.descriptor.provider_id, reason: health });
        continue;
      }
      if (
        health === "degraded" &&
        !(
          record.value.active_policy.policy === "manual" &&
          record.value.active_policy.manual_override === provider.descriptor.provider_id
        )
      ) {
        eliminated.push({ provider_id: provider.descriptor.provider_id, reason: health });
        continue;
      }
      healthy.push({ provider, priority: entry.priority, health });
    }

    const ordered = this.order(record.value.active_policy, healthy);
    const selected = ordered[0]?.provider ?? null;
    const decision = {
      capability_id: capabilityId,
      candidates: entries
        .map(({ provider }) => provider.descriptor.provider_id)
        .slice(0, MAX_ROUTING_LOG_PROVIDERS),
      eliminated: eliminated.slice(0, MAX_ROUTING_LOG_PROVIDERS),
      final_provider_id: selected?.descriptor.provider_id ?? null,
    } satisfies RoutingDecision;
    this.routingLog.push(decision);
    this.logger?.info("provider.routing.decided", {
      capability_id: decision.capability_id,
      candidate_provider_ids: decision.candidates,
      eliminated: decision.eliminated,
      final_provider_id: decision.final_provider_id,
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
        const response = await provider.invoke(request);
        if (
          constraints.required_capabilities?.includes(STREAMING_CAPABILITY) &&
          !isAsyncIterable(response)
        ) {
          this.logger?.warning("provider.streaming.rejected", {
            capability_id: capabilityId,
            provider_id: provider.descriptor.provider_id,
            reason: "response_not_async_iterable",
          });
          continue;
        }
        return ok({
          provider_id: provider.descriptor.provider_id,
          response,
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
      this.registry.updateHealth(capabilityId, provider.descriptor.provider_id, health);
      if (
        health === "reachable" ||
        (health === "degraded" &&
          record.value.active_policy.policy === "manual" &&
          record.value.active_policy.manual_override === provider.descriptor.provider_id)
      ) {
        healthy.push({ provider, priority: entry.priority, health });
      }
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

const tierRank = (tier: HardwareTier): number =>
  tier === "High" ? 2 : tier === "Standard" ? 1 : 0;

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  value !== null &&
  (typeof value === "object" || typeof value === "function") &&
  Symbol.asyncIterator in value;

const compareVersion = (left: string, right: string): number => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};
