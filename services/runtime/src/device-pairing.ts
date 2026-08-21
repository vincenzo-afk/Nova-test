import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type DeviceRuntimeMode = "Full peer" | "Companion";

export interface PairingOffer {
  readonly code: string;
  readonly channel_token: string;
  readonly primary_public_key: string;
  readonly runtime_mode: DeviceRuntimeMode;
  readonly expires_at: number;
}

export interface PairingOptions {
  readonly now?: () => number;
  readonly codeFactory: () => string;
  readonly tokenFactory: () => string;
  readonly verifySignature: (publicKey: string, challenge: string, signature: string) => boolean;
  readonly ttlMs?: number;
}

export interface PairingRequest {
  readonly device_id: string;
  readonly device_public_key: string;
  readonly challenge: string;
  readonly signature: string;
  readonly runtime_mode: DeviceRuntimeMode;
  readonly confirmed: boolean;
}

export interface TrustedDevice {
  readonly device_id: string;
  readonly device_public_key: string;
  readonly runtime_mode: DeviceRuntimeMode;
  readonly state: "Trusted";
  readonly paired_at: number;
}

export class DevicePairingManager {
  private readonly offers = new Map<string, PairingOffer>();
  private readonly trusted = new Map<string, TrustedDevice>();
  private readonly options: Required<Omit<PairingOptions, "now" | "ttlMs">> &
    Pick<PairingOptions, "now" | "ttlMs">;

  public constructor(options: PairingOptions) {
    this.options = options;
  }

  public createOffer(input: {
    readonly runtime_mode: DeviceRuntimeMode;
    readonly primary_public_key: string;
  }): Result<PairingOffer> {
    const offer: PairingOffer = {
      code: this.options.codeFactory(),
      channel_token: this.options.tokenFactory(),
      primary_public_key: input.primary_public_key,
      runtime_mode: input.runtime_mode,
      expires_at: this.now() + (this.options.ttlMs ?? 30_000),
    };
    this.offers.set(offer.code, offer);
    return ok(offer);
  }

  public completePairing(code: string, request: PairingRequest): Result<TrustedDevice> {
    const offer = this.offers.get(code);
    if (!offer || this.now() >= offer.expires_at)
      return err(this.securityError("Pairing offer is expired or unavailable."));
    if (!request.confirmed)
      return err(this.securityError("Pairing requires explicit user confirmation."));
    if (request.runtime_mode !== offer.runtime_mode)
      return err(this.securityError("Paired devices disagree on runtime mode."));
    if (
      !this.options.verifySignature(offer.primary_public_key, request.challenge, request.signature)
    ) {
      return err(this.securityError("Pairing challenge signature could not be verified."));
    }
    const device: TrustedDevice = {
      device_id: request.device_id,
      device_public_key: request.device_public_key,
      runtime_mode: request.runtime_mode,
      state: "Trusted",
      paired_at: this.now(),
    };
    this.trusted.set(device.device_id, device);
    this.offers.delete(code);
    return ok(device);
  }

  public get(deviceId: string): Result<TrustedDevice> {
    const device = this.trusted.get(deviceId);
    return device ? ok(device) : err(this.securityError("Device is not trusted."));
  }

  public unpair(deviceId: string): Result<void> {
    if (!this.trusted.delete(deviceId)) return err(this.securityError("Device is not trusted."));
    return ok(undefined);
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
