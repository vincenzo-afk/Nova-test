import type { PairingOffer } from "@nova/runtime";

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
