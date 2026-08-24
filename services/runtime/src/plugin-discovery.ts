import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";

export interface CapabilityGap {
  readonly capability_id: string;
  readonly domain: string;
  readonly enabled_provider_count: number;
  readonly force?: boolean;
}

export interface PluginTrustSignal {
  readonly verified_publisher: boolean;
  readonly security_reviewed: boolean;
  readonly download_count: number;
}

export interface PluginIndexEntry {
  readonly plugin_id: string;
  readonly latest_version: string;
  readonly publisher: string;
  readonly source_url: string;
  readonly signature_key: string;
  readonly capabilities: readonly string[];
  readonly required_permissions: readonly string[];
  readonly trust: PluginTrustSignal;
}

export interface PluginDiscoveryProposal {
  readonly plugin_id: string;
  readonly latest_version: string;
  readonly publisher: string;
  readonly source_url: string;
  readonly signature_key: string;
  readonly capabilities: readonly string[];
  readonly required_permissions: readonly string[];
  readonly status: "pending";
}

export interface PluginDiscoveryResult {
  readonly capability_id: string;
  readonly domain: string;
  readonly proposals: readonly PluginDiscoveryProposal[];
  readonly fallback: "manual-settings" | null;
}

export interface PluginDiscoveryOptions {
  readonly search: (capabilityId: string) => Promise<readonly PluginIndexEntry[]>;
  readonly install?: (candidate: PluginIndexEntry) => Promise<unknown>;
  readonly logger?: StructuredLogger;
}

export class PluginDiscovery {
  private readonly pendingProposals = new Map<string, PluginDiscoveryProposal>();
  private readonly declined = new Set<string>();
  private readonly confirmed = new Set<string>();

  public constructor(private readonly options: PluginDiscoveryOptions) {}

  public async discover(gap: CapabilityGap): Promise<Result<PluginDiscoveryResult>> {
    if (!isValidGap(gap)) return err(this.failure("Capability gap is invalid."));
    if (gap.enabled_provider_count > 0) {
      return ok({
        capability_id: gap.capability_id,
        domain: gap.domain,
        proposals: [],
        fallback: null,
      });
    }

    this.options.logger?.info("plugin.discovery.started", {
      capability_id: gap.capability_id,
      domain: gap.domain,
      force: gap.force === true,
    });
    let candidates: readonly PluginIndexEntry[];
    try {
      candidates = await this.options.search(gap.capability_id);
    } catch {
      this.options.logger?.warning("plugin.discovery.failed", {
        capability_id: gap.capability_id,
        reason: "registry_search_failed",
      });
      return err(this.failure("Vetted plugin registry search failed."));
    }

    const ranked = candidates
      .filter((candidate) => isVettedCandidate(candidate, gap.capability_id))
      .filter(
        (candidate) =>
          gap.force === true ||
          (!this.declined.has(candidate.plugin_id) && !this.confirmed.has(candidate.plugin_id)),
      )
      .sort((left, right) => rank(right, gap.capability_id) - rank(left, gap.capability_id))
      .slice(0, 3);

    const proposals = ranked.map((candidate) => {
      const proposal: PluginDiscoveryProposal = {
        plugin_id: candidate.plugin_id,
        latest_version: candidate.latest_version,
        publisher: candidate.publisher,
        source_url: candidate.source_url,
        signature_key: candidate.signature_key,
        capabilities: [...candidate.capabilities],
        required_permissions: [...candidate.required_permissions],
        status: "pending",
      };
      this.pendingProposals.set(candidate.plugin_id, proposal);
      return proposal;
    });
    this.options.logger?.info("plugin.discovery.completed", {
      capability_id: gap.capability_id,
      candidate_count: candidates.length,
      proposal_count: proposals.length,
    });
    for (const proposal of proposals) {
      this.options.logger?.info("plugin.discovery.proposal.created", {
        capability_id: gap.capability_id,
        plugin_id: proposal.plugin_id,
        status: proposal.status,
      });
    }
    return ok({
      capability_id: gap.capability_id,
      domain: gap.domain,
      proposals: clone(proposals),
      fallback: proposals.length === 0 ? "manual-settings" : null,
    });
  }

  public confirm(
    pluginId: string,
  ): Result<{ readonly plugin_id: string; readonly status: "approved" }> {
    const proposal = this.pendingProposals.get(pluginId);
    if (!proposal) return err(this.failure("Plugin discovery proposal does not exist."));
    this.pendingProposals.delete(pluginId);
    this.confirmed.add(pluginId);
    this.options.logger?.info("plugin.discovery.proposal.confirmed", {
      plugin_id: pluginId,
      status: "approved",
    });
    return ok({ plugin_id: pluginId, status: "approved" });
  }

  public decline(pluginId: string): Result<void> {
    const proposal = this.pendingProposals.get(pluginId);
    if (!proposal) return err(this.failure("Plugin discovery proposal does not exist."));
    this.pendingProposals.delete(pluginId);
    this.declined.add(pluginId);
    this.options.logger?.info("plugin.discovery.proposal.declined", {
      plugin_id: pluginId,
      status: "declined",
    });
    return ok(undefined);
  }

  public pending(): readonly PluginDiscoveryProposal[] {
    return clone([...this.pendingProposals.values()]);
  }

  private failure(message: string): ErrorInfo {
    return { code: "NOVA-PLG004", message, retryable: false };
  }
}

function isValidGap(gap: CapabilityGap): boolean {
  return (
    gap.capability_id.trim().length > 0 &&
    gap.domain.trim().length > 0 &&
    Number.isSafeInteger(gap.enabled_provider_count) &&
    gap.enabled_provider_count >= 0
  );
}

function isVettedCandidate(candidate: PluginIndexEntry, capabilityId: string): boolean {
  return (
    candidate.plugin_id.trim().length > 0 &&
    candidate.latest_version.trim().length > 0 &&
    candidate.publisher.trim().length > 0 &&
    isHttps(candidate.source_url) &&
    candidate.signature_key.trim().length > 0 &&
    candidate.capabilities.includes(capabilityId) &&
    candidate.required_permissions.every((permission) => permission.trim().length > 0) &&
    candidate.trust.download_count >= 0 &&
    Number.isFinite(candidate.trust.download_count)
  );
}

function rank(candidate: PluginIndexEntry, capabilityId: string): number {
  const exactCapability = candidate.capabilities.includes(capabilityId) ? 100 : 0;
  const trust =
    (candidate.trust.verified_publisher ? 30 : 0) +
    (candidate.trust.security_reviewed ? 30 : 0) +
    Math.min(20, Math.log10(Math.max(1, candidate.trust.download_count)) * 5);
  const permissionScore = Math.max(0, 20 - candidate.required_permissions.length * 5);
  return exactCapability + trust + permissionScore;
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
