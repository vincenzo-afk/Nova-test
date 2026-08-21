import { describe, expect, it, vi } from "vitest";
import { WakeClaimCoordinator, type WakeClaim } from "../src/voice-wake-coordination.js";

const claim = (deviceId: string, detectedAt: number, confidence: number): WakeClaim => ({
  deviceId,
  detectedAt,
  confidence,
});

describe("WakeClaimCoordinator", () => {
  it("broadcasts a local claim, waits 150ms, and suppresses losing devices", async () => {
    const broadcast = vi.fn(async () => undefined);
    const collect = vi.fn(async (windowMs: number) => {
      expect(windowMs).toBe(150);
      return [claim("desktop", 100, 0.8), claim("phone", 101, 0.99)];
    });
    const coordinator = new WakeClaimCoordinator(
      { broadcast, collectClaims: collect },
      { primaryDeviceId: "desktop" },
    );

    const result = await coordinator.coordinate(claim("desktop", 100, 0.8));

    expect(broadcast).toHaveBeenCalledOnce();
    expect(result).toEqual({ winnerDeviceId: "desktop", suppressedDeviceIds: ["phone"] });
  });

  it("uses confidence and then the primary device as deterministic tie-breakers", async () => {
    const coordinator = new WakeClaimCoordinator(
      {
        broadcast: async () => undefined,
        collectClaims: async () => [
          claim("z-device", 100, 0.8),
          claim("primary", 100, 0.8),
          claim("a-device", 100, 0.9),
        ],
      },
      { primaryDeviceId: "primary" },
    );

    await expect(coordinator.coordinate(claim("z-device", 100, 0.8))).resolves.toEqual({
      winnerDeviceId: "a-device",
      suppressedDeviceIds: ["z-device", "primary"],
    });
  });

  it("fails toward one local response when the claim window cannot be collected", async () => {
    const coordinator = new WakeClaimCoordinator({
      broadcast: async () => undefined,
      collectClaims: async () => {
        throw new Error("network unavailable");
      },
    });

    await expect(coordinator.coordinate(claim("desktop", 100, 0.8))).resolves.toEqual({
      winnerDeviceId: "desktop",
      suppressedDeviceIds: [],
    });
  });
});
