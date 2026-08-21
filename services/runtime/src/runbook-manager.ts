import { ok, type Result } from "@nova/shared";

export type RunbookIncident = "startup-failure" | "provider-down" | "sync-failure";
export type RunbookState = "Resolved" | "Escalated";

export interface RunbookOperations {
  readonly restoreLastKnownGoodConfig: () => Promise<boolean>;
  readonly engageProviderFallback: () => Promise<boolean>;
  readonly resumeSyncCheckpoint: () => Promise<boolean>;
  readonly fullResync: () => Promise<boolean>;
  readonly notifyDegraded: () => Promise<void>;
}

export interface RunbookResult {
  readonly state: RunbookState;
  readonly action: string;
}

export class RunbookManager {
  public constructor(private readonly operations: RunbookOperations) {}

  public async handle(incident: RunbookIncident): Promise<Result<RunbookResult>> {
    if (incident === "startup-failure") {
      return (await this.operations.restoreLastKnownGoodConfig())
        ? ok({ state: "Resolved", action: "last-known-good-config" })
        : this.escalate();
    }
    if (incident === "provider-down") {
      if (await this.operations.engageProviderFallback())
        return ok({ state: "Resolved", action: "provider-fallback" });
      return this.escalate();
    }
    if (await this.operations.resumeSyncCheckpoint())
      return ok({ state: "Resolved", action: "resume-checkpoint" });
    if (await this.operations.fullResync()) return ok({ state: "Resolved", action: "full-resync" });
    return this.escalate();
  }

  private async escalate(): Promise<Result<RunbookResult>> {
    await this.operations.notifyDegraded();
    return ok({ state: "Escalated", action: "notify-degraded" });
  }
}
