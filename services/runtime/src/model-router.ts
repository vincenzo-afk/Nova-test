import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import { z } from "zod";

export type HealthState = "reachable" | "degraded" | "down";

export interface ProviderHealthStatus {
  readonly provider_id: string;
  readonly health: HealthState;
}
export type PrivacyRequirement = "local_only" | "any";
export type ModelCapability = "tool_calls" | "vision_input" | "streaming";

export interface LlmProvider {
  readonly descriptor: {
    readonly provider_id: string;
    readonly domain: "llm";
    readonly privacy_class: "local" | "cloud";
    readonly schema_version: string;
    readonly cost_per_1k_tokens: number;
    readonly capabilities: {
      readonly tool_calls: boolean;
      readonly vision_input: boolean;
      readonly streaming: boolean;
      readonly max_context_tokens: number;
    };
  };
  readonly healthCheck: () => Promise<HealthState>;
  readonly invoke: (request: ModelRequest) => Promise<unknown>;
}

export interface ModelMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface ModelRequest {
  readonly task_type?: string;
  readonly privacy?: PrivacyRequirement;
  readonly required_capabilities?: readonly ModelCapability[];
  readonly messages?: readonly ModelMessage[];
  readonly temperature?: number;
  readonly max_cost_per_1k_tokens?: number;
  readonly required_schema_version?: string;
}

export interface ModelResponse {
  readonly text: string;
  readonly provider_id: string;
}

export interface ModelRouterOptions {
  readonly preference?: readonly string[];
  readonly retryAttempts?: number;
  readonly requestTimeoutMs?: number;
  readonly circuitFailureThreshold?: number;
  readonly circuitCooldownMs?: number;
  readonly now?: () => number;
}

const modelResponseSchema = z.object({ text: z.string(), provider_id: z.string() });

export class ModelRouter {
  private readonly states = new Map<
    string,
    { consecutiveFailures: number; openedAt?: number; health: HealthState }
  >();
  private readonly options: Required<ModelRouterOptions>;
  private readonly providers: readonly LlmProvider[];

  constructor(providers: readonly LlmProvider[], options: ModelRouterOptions = {}) {
    this.providers = providers;
    this.options = {
      preference: options.preference ?? [],
      retryAttempts: options.retryAttempts ?? 2,
      requestTimeoutMs: options.requestTimeoutMs ?? 30_000,
      circuitFailureThreshold: options.circuitFailureThreshold ?? 5,
      circuitCooldownMs: options.circuitCooldownMs ?? 60_000,
      now: options.now ?? (() => Date.now()),
    };
    for (const provider of providers) {
      this.states.set(provider.descriptor.provider_id, {
        consecutiveFailures: 0,
        health: "reachable",
      });
    }
  }

  async invoke(request: ModelRequest): Promise<Result<ModelResponse>> {
    const candidates = await this.eligibleProviders(request);
    if (candidates.length === 0) {
      return err({
        code: "NOVA-AI001",
        message: "No configured provider satisfies the current routing constraints.",
        retryable: false,
      });
    }

    for (const provider of candidates) {
      const state = this.states.get(provider.descriptor.provider_id);
      if (!state || this.isCircuitOpen(state)) {
        continue;
      }
      for (let attempt = 0; attempt < this.options.retryAttempts; attempt += 1) {
        try {
          const raw = await this.withTimeout(provider.invoke(request));
          const parsed = modelResponseSchema.safeParse(raw);
          if (!parsed.success) {
            this.recordFailure(provider);
            return err(this.providerError("Provider response failed schema validation."));
          }
          this.recordSuccess(provider);
          return ok(parsed.data);
        } catch {
          this.recordFailure(provider);
          if (attempt === this.options.retryAttempts - 1) {
            break;
          }
        }
      }
    }

    return err(
      this.providerError(
        "All eligible providers failed after bounded retry and fallback attempts.",
      ),
    );
  }

  health(providerId: string): HealthState {
    const state = this.states.get(providerId);
    if (!state) {
      return "down";
    }
    return this.isCircuitOpen(state) ? "down" : state.health;
  }

  providerHealthStatuses(): readonly ProviderHealthStatus[] {
    return [...this.states.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, 128)
      .map(([provider_id, state]) => ({
        provider_id,
        health: this.isCircuitOpen(state) ? "down" : state.health,
      }));
  }

  private async eligibleProviders(request: ModelRequest): Promise<LlmProvider[]> {
    const candidates: LlmProvider[] = [];
    for (const provider of this.providers) {
      const descriptor = provider.descriptor;
      const state = this.states.get(descriptor.provider_id);
      if (!state || this.isCircuitOpen(state)) {
        continue;
      }
      if (request.privacy === "local_only" && descriptor.privacy_class !== "local") {
        continue;
      }
      if (
        request.max_cost_per_1k_tokens !== undefined &&
        descriptor.cost_per_1k_tokens > request.max_cost_per_1k_tokens
      ) {
        continue;
      }
      if (
        !this.supportsCapabilities(descriptor.capabilities, request.required_capabilities ?? [])
      ) {
        continue;
      }
      if (
        request.required_schema_version &&
        compareVersion(descriptor.schema_version, request.required_schema_version) < 0
      ) {
        continue;
      }
      const health = await provider.healthCheck();
      state.health = health;
      if (health === "down") {
        continue;
      }
      candidates.push(provider);
    }

    const preference = this.options.preference;
    candidates.sort((left, right) => {
      const leftPreference = preference.indexOf(left.descriptor.provider_id);
      const rightPreference = preference.indexOf(right.descriptor.provider_id);
      const leftRank = leftPreference < 0 ? Number.MAX_SAFE_INTEGER : leftPreference;
      const rightRank = rightPreference < 0 ? Number.MAX_SAFE_INTEGER : rightPreference;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.descriptor.cost_per_1k_tokens - right.descriptor.cost_per_1k_tokens;
    });
    return candidates;
  }

  private supportsCapabilities(
    capabilities: LlmProvider["descriptor"]["capabilities"],
    required: readonly ModelCapability[],
  ): boolean {
    return required.every((capability) => capabilities[capability]);
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error("Provider request timed out.")),
        this.options.requestTimeoutMs,
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private recordFailure(provider: LlmProvider): void {
    const state = this.states.get(provider.descriptor.provider_id);
    if (!state) {
      return;
    }
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= this.options.circuitFailureThreshold) {
      state.openedAt = this.options.now();
      state.health = "down";
    }
  }

  private recordSuccess(provider: LlmProvider): void {
    const state = this.states.get(provider.descriptor.provider_id);
    if (!state) {
      return;
    }
    state.consecutiveFailures = 0;
    delete state.openedAt;
    state.health = "reachable";
  }

  private isCircuitOpen(state: { readonly openedAt?: number }): boolean {
    return (
      state.openedAt !== undefined &&
      this.options.now() - state.openedAt < this.options.circuitCooldownMs
    );
  }

  private providerError(message: string): ErrorInfo {
    return { code: "NOVA-AI002", message, retryable: true };
  }
}

const compareVersion = (left: string, right: string): number => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};
