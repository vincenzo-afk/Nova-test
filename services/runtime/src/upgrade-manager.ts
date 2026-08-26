import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface UpgradeRequest {
  readonly current_version: number;
  readonly target_version: number;
}

export interface UpgradeAdapter {
  readonly snapshot: () => Promise<string>;
  readonly pauseInFlight?: () => Promise<void>;
  readonly migrate: (
    fromVersion: number,
    toVersion: number,
  ) => Promise<{ readonly version: number }>;
  readonly updatePlugins: () => Promise<void>;
  readonly verify: () => Promise<boolean>;
  readonly resumeAfterUpgrade?: () => Promise<void>;
  readonly rollback: (snapshotId: string) => Promise<void>;
}

export interface UpgradeResult {
  readonly status: "Upgraded";
  readonly version: number;
}

export class UpgradeManager {
  public constructor(private readonly adapter: UpgradeAdapter) {}

  public async upgrade(request: UpgradeRequest): Promise<Result<UpgradeResult>> {
    if (request.target_version < request.current_version)
      return err(
        this.recoveryError("Downgrade is not supported by the forward-only migration chain."),
      );
    if (request.target_version === request.current_version)
      return ok({ status: "Upgraded", version: request.current_version });
    if (
      (this.adapter.pauseInFlight === undefined) !==
      (this.adapter.resumeAfterUpgrade === undefined)
    )
      return err(this.recoveryError("Upgrade pause and resume hooks must be configured together."));

    let snapshotId: string | undefined;
    let paused = false;
    let resumeAttempted = false;
    try {
      snapshotId = await this.adapter.snapshot();
      if (this.adapter.pauseInFlight !== undefined) {
        await this.adapter.pauseInFlight();
        paused = true;
      }
      for (let version = request.current_version; version < request.target_version; version += 1) {
        const result = await this.adapter.migrate(version, version + 1);
        if (result.version !== version + 1)
          throw new Error("Migration returned an unexpected version.");
      }
      await this.adapter.updatePlugins();
      if (!(await this.adapter.verify())) throw new Error("Upgrade verification failed.");
      if (paused && this.adapter.resumeAfterUpgrade !== undefined) {
        resumeAttempted = true;
        await this.adapter.resumeAfterUpgrade();
      }
      return ok({ status: "Upgraded", version: request.target_version });
    } catch {
      if (snapshotId !== undefined) {
        try {
          await this.adapter.rollback(snapshotId);
        } catch {
          return err(this.recoveryError("Upgrade and rollback both failed."));
        }
      }
      if (paused && !resumeAttempted && this.adapter.resumeAfterUpgrade !== undefined) {
        try {
          await this.adapter.resumeAfterUpgrade();
        } catch {
          return err(this.recoveryError("Upgrade rollback succeeded but task resumption failed."));
        }
      }
      return err(
        this.recoveryError("Upgrade failed and was rolled back to the pre-upgrade snapshot."),
      );
    }
  }

  private recoveryError(message: string): ErrorInfo {
    return { code: "NOVA-EVT002", message, retryable: false };
  }
}
