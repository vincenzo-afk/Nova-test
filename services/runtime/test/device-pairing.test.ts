import { describe, expect, it, vi } from "vitest";
import { DevicePairingManager } from "../src/device-pairing.js";

describe("DevicePairingManager", () => {
  it("creates a short-lived offer and trusts a device only after signed challenge verification", () => {
    const now = 1000;
    const verify = vi.fn(() => true);
    const manager = new DevicePairingManager({
      now: () => now,
      codeFactory: () => "PAIR-1234",
      tokenFactory: () => "channel-token",
      verifySignature: verify,
    });
    const offer = manager.createOffer({
      runtime_mode: "Companion",
      primary_public_key: "primary-key",
    });

    expect(offer).toMatchObject({ ok: true, value: { code: "PAIR-1234", expires_at: 31_000 } });
    const trusted = manager.completePairing("PAIR-1234", {
      device_id: "android-1",
      device_public_key: "device-key",
      challenge: "nonce-1",
      signature: "signature-1",
      runtime_mode: "Companion",
      confirmed: true,
    });

    expect(trusted).toMatchObject({
      ok: true,
      value: { device_id: "android-1", state: "Trusted", runtime_mode: "Companion" },
    });
    expect(verify).toHaveBeenCalledWith("primary-key", "nonce-1", "signature-1");
  });

  it("rejects skipped confirmation, invalid signatures, mode mismatches, reuse, and expiry", () => {
    let now = 1000;
    const manager = new DevicePairingManager({
      now: () => now,
      codeFactory: () => "PAIR-1234",
      tokenFactory: () => "channel-token",
      verifySignature: () => false,
    });
    manager.createOffer({ runtime_mode: "Full peer", primary_public_key: "primary-key" });

    expect(
      manager.completePairing("PAIR-1234", {
        device_id: "peer-1",
        device_public_key: "peer-key",
        challenge: "nonce",
        signature: "sig",
        runtime_mode: "Full peer",
        confirmed: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(
      manager.completePairing("PAIR-1234", {
        device_id: "peer-1",
        device_public_key: "peer-key",
        challenge: "nonce",
        signature: "sig",
        runtime_mode: "Companion",
        confirmed: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(
      manager.completePairing("PAIR-1234", {
        device_id: "peer-1",
        device_public_key: "peer-key",
        challenge: "nonce",
        signature: "sig",
        runtime_mode: "Full peer",
        confirmed: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });

    const validManager = new DevicePairingManager({
      now: () => now,
      codeFactory: () => "PAIR-2",
      tokenFactory: () => "t2",
      verifySignature: () => true,
    });
    validManager.createOffer({ runtime_mode: "Companion", primary_public_key: "primary" });
    expect(
      validManager.completePairing("PAIR-2", {
        device_id: "d2",
        device_public_key: "k2",
        challenge: "n2",
        signature: "s2",
        runtime_mode: "Companion",
        confirmed: true,
      }),
    ).toMatchObject({ ok: true });
    expect(
      validManager.completePairing("PAIR-2", {
        device_id: "d3",
        device_public_key: "k3",
        challenge: "n3",
        signature: "s3",
        runtime_mode: "Companion",
        confirmed: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });

    const expired = new DevicePairingManager({
      now: () => now,
      codeFactory: () => "PAIR-3",
      tokenFactory: () => "t3",
      verifySignature: () => true,
    });
    expired.createOffer({ runtime_mode: "Companion", primary_public_key: "primary" });
    now = 31_001;
    expect(
      expired.completePairing("PAIR-3", {
        device_id: "d4",
        device_public_key: "k4",
        challenge: "n4",
        signature: "s4",
        runtime_mode: "Companion",
        confirmed: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });

  it("lists trusted devices without exposing pairing channel secrets", () => {
    const manager = new DevicePairingManager({
      codeFactory: () => "PAIR",
      tokenFactory: () => "secret-channel-token",
      verifySignature: () => true,
    });
    manager.createOffer({ runtime_mode: "Companion", primary_public_key: "primary" });
    manager.completePairing("PAIR", {
      device_id: "android-1",
      device_public_key: "key-1",
      challenge: "nonce-1",
      signature: "sig-1",
      runtime_mode: "Companion",
      confirmed: true,
    });

    expect(manager.listTrusted()).toEqual([
      {
        device_id: "android-1",
        device_public_key: "key-1",
        runtime_mode: "Companion",
        state: "Trusted",
        paired_at: expect.any(Number),
      },
    ]);
    expect(JSON.stringify(manager.listTrusted())).not.toContain("secret-channel-token");
  });

  it("unpairs and revokes a trusted device", () => {
    const manager = new DevicePairingManager({
      codeFactory: () => "PAIR",
      tokenFactory: () => "token",
      verifySignature: () => true,
    });
    manager.createOffer({ runtime_mode: "Companion", primary_public_key: "primary" });
    manager.completePairing("PAIR", {
      device_id: "android-1",
      device_public_key: "key",
      challenge: "nonce",
      signature: "sig",
      runtime_mode: "Companion",
      confirmed: true,
    });

    expect(manager.unpair("android-1")).toMatchObject({ ok: true });
    expect(manager.get("android-1")).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });
});
