import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type WorkspaceState = "Created" | "Active" | "Locked" | "Recovering";

export interface WorkspaceOptions {
  readonly user_id: string;
  readonly workspace_id: string;
  readonly now?: () => number;
  readonly lockLeaseMs?: number;
}

export interface WorkspaceIdentity {
  readonly user_id: string;
  readonly workspace_id: string;
}

export interface WorkspaceLock {
  readonly token: string;
  readonly reason: string;
  readonly expires_at: number;
  readonly state: "Locked";
}

export class WorkspaceManager {
  private currentState: WorkspaceState = "Created";
  private lock: WorkspaceLock | undefined;
  private sequence = 0;
  private readonly options: Required<Pick<WorkspaceOptions, "user_id" | "workspace_id">> &
    WorkspaceOptions;

  public constructor(options: WorkspaceOptions) {
    this.options = options;
  }

  public state(): WorkspaceState {
    return this.currentState;
  }

  public identity(): WorkspaceIdentity {
    return { user_id: this.options.user_id, workspace_id: this.options.workspace_id };
  }

  public createWorkspace(workspaceId: string): Result<WorkspaceIdentity> {
    if (workspaceId !== this.options.workspace_id)
      return err(
        this.securityError("Multiple workspaces are not supported for one NOVA identity."),
      );
    return ok(this.identity());
  }

  public activate(): Result<void> {
    if (this.currentState !== "Created" && this.currentState !== "Recovering")
      return err(this.securityError("Workspace cannot enter Active from its current state."));
    this.currentState = "Active";
    return ok(undefined);
  }

  public acquireLock(reason: string): Result<WorkspaceLock> {
    if (this.currentState !== "Active")
      return err(this.securityError("Workspace lock requires an Active workspace."));
    const lock: WorkspaceLock = {
      token: `lock-${++this.sequence}`,
      reason,
      expires_at: this.now() + (this.options.lockLeaseMs ?? 60_000),
      state: "Locked",
    };
    this.lock = lock;
    this.currentState = "Locked";
    return ok(lock);
  }

  public releaseLock(token: string): Result<void> {
    if (this.currentState !== "Locked" || this.lock?.token !== token)
      return err(this.securityError("Workspace lock token is invalid or expired."));
    this.lock = undefined;
    this.currentState = "Active";
    return ok(undefined);
  }

  public expireLock(): Result<{ state: "Recovering" }> {
    if (this.currentState !== "Locked" || !this.lock || this.now() < this.lock.expires_at)
      return err(this.securityError("Workspace lock has not expired."));
    this.lock = undefined;
    this.currentState = "Recovering";
    return ok({ state: "Recovering" });
  }

  public beginRecovery(): Result<{ state: "Recovering" }> {
    if (this.currentState !== "Active" && this.currentState !== "Locked")
      return err(this.securityError("Workspace cannot enter recovery from its current state."));
    this.lock = undefined;
    this.currentState = "Recovering";
    return ok({ state: "Recovering" });
  }

  public completeRecovery(): Result<{ state: "Active" }> {
    if (this.currentState !== "Recovering")
      return err(this.securityError("Workspace recovery is not in progress."));
    this.currentState = "Active";
    return ok({ state: "Active" });
  }

  public canSync(): boolean {
    return this.currentState === "Active";
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
