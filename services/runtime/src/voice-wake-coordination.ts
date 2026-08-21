export interface WakeClaim {
  readonly deviceId: string;
  readonly detectedAt: number;
  readonly confidence: number;
}

export interface WakeClaimResolution {
  readonly winnerDeviceId: string;
  readonly suppressedDeviceIds: readonly string[];
}

export interface WakeClaimTransport {
  readonly broadcast: (claim: WakeClaim) => Promise<void>;
  readonly collectClaims: (windowMs: number) => Promise<readonly WakeClaim[]>;
}

export interface WakeClaimCoordinatorOptions {
  readonly primaryDeviceId?: string;
  readonly claimWindowMs?: number;
}

export class WakeClaimCoordinator {
  private readonly primaryDeviceId: string | undefined;
  private readonly claimWindowMs: number;

  public constructor(
    private readonly transport: WakeClaimTransport,
    options: WakeClaimCoordinatorOptions = {},
  ) {
    this.primaryDeviceId = options.primaryDeviceId;
    this.claimWindowMs = options.claimWindowMs ?? 150;
  }

  public async coordinate(localClaim: WakeClaim): Promise<WakeClaimResolution> {
    await this.transport.broadcast(localClaim).catch(() => undefined);
    let claims: readonly WakeClaim[];
    try {
      claims = await this.transport.collectClaims(this.claimWindowMs);
    } catch {
      claims = [];
    }
    const uniqueClaims = new Map<string, WakeClaim>();
    for (const claim of [localClaim, ...claims]) {
      uniqueClaims.set(this.claimKey(claim), claim);
    }
    const ordered = [...uniqueClaims.values()].sort((left, right) => this.compare(left, right));
    const winnerDeviceId = ordered[0]?.deviceId ?? localClaim.deviceId;
    return {
      winnerDeviceId,
      suppressedDeviceIds: [...uniqueClaims.values()]
        .filter((claim) => claim.deviceId !== winnerDeviceId)
        .map((claim) => claim.deviceId),
    };
  }

  private compare(left: WakeClaim, right: WakeClaim): number {
    if (left.detectedAt !== right.detectedAt) return left.detectedAt - right.detectedAt;
    if (left.confidence !== right.confidence) return right.confidence - left.confidence;
    if (left.deviceId === this.primaryDeviceId) return -1;
    if (right.deviceId === this.primaryDeviceId) return 1;
    return left.deviceId.localeCompare(right.deviceId);
  }

  private claimKey(claim: WakeClaim): string {
    return `${claim.deviceId}:${claim.detectedAt}:${claim.confidence}`;
  }
}
