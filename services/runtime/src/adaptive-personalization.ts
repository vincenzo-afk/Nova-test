import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";
import type {
  ConfigurationStore,
  PersonalizationCategory,
  PersonalizationPreferenceRecord,
} from "./configuration-store.js";

export interface AdaptivePreferenceInput {
  readonly id: string;
  readonly category: PersonalizationCategory;
  readonly value: unknown;
}

export interface AdaptivePreferenceProposal {
  readonly proposal_id: string;
  readonly status: "pending";
  readonly preference: PersonalizationPreferenceRecord;
}

export interface AdaptivePreferenceSummary {
  readonly proposal_id: string;
  readonly status: "pending";
  readonly category: PersonalizationCategory;
}

export interface RoutingPreferenceSuggestionInput {
  readonly capability_id: string;
  readonly provider_id: string;
  readonly manual_override_count: number;
}

const PERSONALIZATION_CATEGORIES: readonly PersonalizationCategory[] = [
  "tool-default",
  "provider-default",
  "proactive-timing",
  "routing-preference",
  "tone",
];
const ROUTING_SUGGESTION_THRESHOLD = 5;
const MAX_IDENTIFIER_LENGTH = 128;

export class AdaptivePersonalization {
  private readonly proposals = new Map<string, AdaptivePreferenceProposal>();

  public constructor(
    private readonly configurationStore: ConfigurationStore,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly logger?: StructuredLogger,
  ) {}

  public propose(input: AdaptivePreferenceInput): Result<AdaptivePreferenceProposal> {
    const id = boundedIdentifier(input.id);
    if (id.length === 0) return err(this.failure("Adaptive preference id is required."));
    if (!PERSONALIZATION_CATEGORIES.includes(input.category))
      return err(this.failure("Adaptive preference category is invalid."));
    if (this.proposals.has(id))
      return err(this.failure("An adaptive preference proposal is already pending."));

    const preference: PersonalizationPreferenceRecord = {
      id,
      category: input.category,
      value: clone(input.value),
      enabled: true,
      source: "feedback",
      updated_at: this.now(),
    };
    const proposal: AdaptivePreferenceProposal = {
      proposal_id: id,
      status: "pending",
      preference,
    };
    this.proposals.set(id, proposal);
    this.logger?.info("personalization.proposal.created", {
      proposal_id: id,
      category: input.category,
    });
    return ok(clone(proposal));
  }

  public suggestRoutingPreference(
    input: RoutingPreferenceSuggestionInput,
  ): Result<AdaptivePreferenceProposal> | undefined {
    if (
      !Number.isSafeInteger(input.manual_override_count) ||
      input.manual_override_count < ROUTING_SUGGESTION_THRESHOLD
    )
      return undefined;
    const capabilityId = boundedIdentifier(input.capability_id);
    const providerId = boundedIdentifier(input.provider_id);
    if (capabilityId.length === 0 || providerId.length === 0)
      return err(this.failure("Routing preference suggestion identifiers are required."));
    return this.propose({
      id: `routing.${capabilityId}.${providerId}`,
      category: "routing-preference",
      value: { capability_id: capabilityId, provider_id: providerId },
    });
  }

  public approve(proposalId: string): Result<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return err(this.failure("Adaptive preference proposal does not exist."));

    const existing = this.configurationStore.snapshot().personalization.preferences;
    const preferences = [
      ...existing.filter((preference) => preference.id !== proposal.preference.id),
      clone(proposal.preference),
    ];
    const result = this.configurationStore.update("personalization", { preferences });
    if (!result.ok) return result;

    this.proposals.delete(proposalId);
    this.logger?.info("personalization.proposal.approved", {
      proposal_id: proposal.proposal_id,
      category: proposal.preference.category,
    });
    return ok(undefined);
  }

  public dismiss(proposalId: string): Result<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return err(this.failure("Adaptive preference proposal does not exist."));
    this.proposals.delete(proposalId);
    this.logger?.info("personalization.proposal.dismissed", {
      proposal_id: proposal.proposal_id,
      category: proposal.preference.category,
    });
    return ok(undefined);
  }

  public pending(): readonly AdaptivePreferenceProposal[] {
    return [...this.proposals.values()].map(clone);
  }

  public pendingSummaries(): readonly AdaptivePreferenceSummary[] {
    return [...this.proposals.values()].map(({ proposal_id, status, preference }) => ({
      proposal_id,
      status,
      category: preference.category,
    }));
  }

  public reset(preferenceId?: string): Result<void> {
    return this.configurationStore.resetPersonalization(preferenceId);
  }

  private failure(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function boundedIdentifier(value: string): string {
  return value.trim().slice(0, MAX_IDENTIFIER_LENGTH);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
