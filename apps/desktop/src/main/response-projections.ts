import type { PairingOffer, PluginRecord } from "@nova/runtime";

export interface PairingOfferSummary {
  readonly code: string;
  readonly primary_public_key: string;
  readonly runtime_mode: PairingOffer["runtime_mode"];
  readonly expires_at: number;
}

export function projectPairingOffer(offer: PairingOffer): PairingOfferSummary {
  return {
    code: offer.code,
    primary_public_key: offer.primary_public_key,
    runtime_mode: offer.runtime_mode,
    expires_at: offer.expires_at,
  };
}

export interface PluginRecordSummary {
  readonly plugin_id: string;
  readonly version: string;
  readonly state: PluginRecord["state"];
  readonly provided_tool_count: number;
  readonly required_permission_count: number;
}

export function projectPluginRecord(record: PluginRecord): PluginRecordSummary {
  return {
    plugin_id: record.manifest.plugin_id,
    version: record.manifest.version,
    state: record.state,
    provided_tool_count: record.manifest.provided_tools.length,
    required_permission_count: record.manifest.required_permissions.length,
  };
}
