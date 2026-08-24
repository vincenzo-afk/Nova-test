import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type RemoteSessionState = "AwaitingApproval" | "Active" | "Expired" | "Revoked";

export interface RemoteSessionRequest {
  readonly session_id: string;
  readonly initiator_device_id: string;
  readonly signature: string;
}

export interface RemoteCommand {
  readonly command_id: string;
  readonly content: string;
  readonly destructive: boolean;
  readonly confirmed?: boolean;
}

export interface RemoteTransport {
  readonly verify: (request: RemoteSessionRequest) => boolean;
  readonly send: (sessionId: string, command: RemoteCommand) => Promise<void>;
}

export interface RemoteControlOptions {
  readonly now?: () => number;
  readonly sessionTtlMs?: number;
}

interface Session {
  readonly session_id: string;
  readonly initiator_device_id: string;
  readonly expires_at: number;
  state: RemoteSessionState;
}

export interface RemoteSessionView {
  readonly session_id: string;
  readonly initiator_device_id: string;
  readonly expires_at: number;
  readonly state: RemoteSessionState;
}

export interface RemoteExecutionReceipt {
  readonly command_id: string;
  readonly audit_origin: "remote";
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

export class RemoteControlManager {
  private readonly sessions = new Map<string, Session>();
  private readonly preapprovals = new Map<string, number>();
  private readonly revokedDevices = new Set<string>();
  private readonly options: Required<Pick<RemoteControlOptions, "sessionTtlMs">> &
    RemoteControlOptions;

  public constructor(
    private readonly transport: RemoteTransport,
    options: RemoteControlOptions = {},
  ) {
    this.options = { sessionTtlMs: 3_600_000, ...options };
  }

  public preApprove(deviceId: string, durationMs: number): void {
    this.revokedDevices.delete(deviceId);
    this.preapprovals.set(deviceId, this.now() + durationMs);
  }

  public requestSession(request: RemoteSessionRequest): Result<RemoteSessionView> {
    const sessionTtlMs = this.options.sessionTtlMs;
    if (!Number.isSafeInteger(sessionTtlMs) || sessionTtlMs <= 0)
      return err(this.securityError("Remote session TTL must be a positive safe integer."));
    if (
      !hasText(request.session_id) ||
      !hasText(request.initiator_device_id) ||
      !hasText(request.signature)
    ) {
      return err(this.securityError("Remote session fields are invalid."));
    }
    if (this.revokedDevices.has(request.initiator_device_id))
      return err(this.securityError("Remote-control trust has been revoked for this device."));
    if (this.sessions.has(request.session_id))
      return err(this.securityError("Remote session identifier is already active."));
    if (!this.transport.verify(request))
      return err(this.securityError("Remote session signature could not be verified."));
    const expiresAt = this.now() + sessionTtlMs;
    const state: RemoteSessionState =
      (this.preapprovals.get(request.initiator_device_id) ?? 0) > this.now()
        ? "Active"
        : "AwaitingApproval";
    const session: Session = {
      session_id: request.session_id,
      initiator_device_id: request.initiator_device_id,
      expires_at: expiresAt,
      state,
    };
    this.sessions.set(request.session_id, session);
    return ok(this.view(session));
  }

  public approve(sessionId: string): Result<RemoteSessionView> {
    const session = this.sessions.get(sessionId);
    if (!session || this.expired(session))
      return err(this.securityError("Remote session is expired or unavailable."));
    if (session.state !== "AwaitingApproval")
      return err(this.securityError("Remote session is not awaiting approval."));
    session.state = "Active";
    return ok(this.view(session));
  }

  public revoke(deviceId: string): void {
    this.preapprovals.delete(deviceId);
    this.revokedDevices.add(deviceId);
    for (const session of this.sessions.values()) {
      if (session.initiator_device_id === deviceId) session.state = "Revoked";
    }
  }

  public async execute(
    sessionId: string,
    command: RemoteCommand,
  ): Promise<Result<RemoteExecutionReceipt>> {
    if (!hasText(sessionId) || !hasText(command.command_id) || !hasText(command.content))
      return err(this.securityError("Remote command fields are invalid."));
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== "Active" || this.expired(session))
      return err(this.securityError("Remote session is expired, revoked, or not approved."));
    if (command.destructive && command.confirmed !== true)
      return err(this.securityError("Destructive remote commands require explicit confirmation."));
    try {
      await this.transport.send(sessionId, command);
      return ok({ command_id: command.command_id, audit_origin: "remote" });
    } catch {
      return err({
        code: "NOVA-NET001",
        message: "Remote command transport failed.",
        retryable: true,
      });
    }
  }

  private expired(session: Session): boolean {
    if (this.now() < session.expires_at) return false;
    session.state = "Expired";
    return true;
  }

  private view(session: Session): RemoteSessionView {
    return {
      session_id: session.session_id,
      initiator_device_id: session.initiator_device_id,
      expires_at: session.expires_at,
      state: session.state,
    };
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
