import { describe, expect, it } from "vitest";
import type { PairingOffer } from "@nova/runtime";
import { projectPairingOffer } from "../src/main/response-projections.js";

describe("pairing renderer boundary", () => {
  it("omits channel credentials from the renderer projection", () => {
    const offer: PairingOffer = {
      code: "ABCD-1234",
      channel_token: "secret-channel-token",
      primary_public_key: "primary-public-key",
      runtime_mode: "Companion",
      expires_at: 1_750_000_000_000,
    };

    const projected = projectPairingOffer(offer);

    expect(projected).toEqual({
      code: "ABCD-1234",
      primary_public_key: "primary-public-key",
      runtime_mode: "Companion",
      expires_at: 1_750_000_000_000,
    });
    expect("channel_token" in projected).toBe(false);
    expect(JSON.stringify(projected)).not.toContain("secret-channel-token");
  });
});
