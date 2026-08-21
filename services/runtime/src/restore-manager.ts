import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface RestoreSource {
  readonly load: (snapshotId: string) => Promise<unknown>;
}

export interface LiveStateStore {
  readonly read: () => Promise<unknown>;
  readonly swap: (state: unknown) => Promise<void>;
}

export interface PreparedRestore {
  readonly verified: boolean;
  readonly staging: unknown;
}

export class RestoreManager {
  public constructor(
    private readonly source: RestoreSource,
    private readonly live: LiveStateStore,
  ) {}

  public async prepare(snapshotId: string): Promise<Result<PreparedRestore>> {
    try {
      const staging = await this.source.load(snapshotId);
      if (staging === null || staging === undefined)
        return err(this.recoveryError("Restore staging state is empty."));
      return ok({ verified: true, staging });
    } catch {
      return err(this.recoveryError("Restore snapshot could not be loaded or verified."));
    }
  }

  public async apply(prepared: PreparedRestore, confirmed: boolean): Promise<Result<void>> {
    if (!confirmed)
      return err(this.securityError("Restoring state requires explicit confirmation."));
    if (!prepared.verified)
      return err(this.recoveryError("Restore staging state has not been verified."));
    try {
      await this.live.swap(prepared.staging);
      return ok(undefined);
    } catch {
      return err(this.recoveryError("Verified restore could not be swapped into the live store."));
    }
  }

  private recoveryError(message: string): ErrorInfo {
    return { code: "NOVA-EVT002", message, retryable: false };
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
