import type { StructuredLogger } from "@nova/shared";
import { CapabilityRegistry, type CapabilityDomain, type CapabilityRecord } from "@nova/runtime";

export interface DesktopCapabilityCatalogEntry {
  readonly capability_id: string;
  readonly domain: CapabilityDomain;
}

export const DESKTOP_CAPABILITY_CATALOG: readonly DesktopCapabilityCatalogEntry[] = [
  { capability_id: "text-generation", domain: "llm" },
  { capability_id: "vision", domain: "vision" },
  { capability_id: "speech-to-text", domain: "speech-to-text" },
  { capability_id: "text-to-speech", domain: "text-to-speech" },
  { capability_id: "embeddings", domain: "embeddings" },
  { capability_id: "ocr", domain: "ocr" },
  { capability_id: "reranking", domain: "reranking" },
  { capability_id: "messaging-channel", domain: "messaging-channel" },
  { capability_id: "remote-control", domain: "remote-control" },
];

export function createDesktopCapabilityRegistry(logger?: StructuredLogger): CapabilityRegistry {
  const registry = new CapabilityRegistry(logger);
  for (const { capability_id, domain } of DESKTOP_CAPABILITY_CATALOG) {
    const result = registry.declareCapability(capability_id, domain);
    if (!result.ok) throw new Error(result.error.message);
  }
  return registry;
}

export function listDesktopCapabilityCatalog(): readonly CapabilityRecord[] {
  return createDesktopCapabilityRegistry().listCapabilities();
}
