import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type PresenceState =
  "Online" | "Idle" | "Busy" | "Sleeping" | "Offline" | "Syncing" | "Updating";
export type CapabilityStatus = "Supported" | "Not supported" | "Permission denied" | "Degraded";

export interface DeviceCapability {
  readonly capability_id: string;
  readonly status: CapabilityStatus;
}

export interface SessionState {
  readonly session_id: string;
  readonly active_device_id: string;
}

export interface DeviceSnapshot {
  readonly device_id: string;
  readonly presence: PresenceState;
  readonly capabilities: readonly DeviceCapability[];
}

export interface SessionContinuityOptions {
  readonly now?: () => number;
  readonly heartbeatIntervalMs?: number;
}

interface DeviceState {
  readonly device_id: string;
  presence: PresenceState;
  lastHeartbeat: number;
  capabilities: Map<string, CapabilityStatus>;
}

export class SessionContinuityManager {
  private readonly devices = new Map<string, DeviceState>();
  private readonly sessions = new Map<string, SessionState>();
  private readonly options: Required<Pick<SessionContinuityOptions, "heartbeatIntervalMs">> &
    SessionContinuityOptions;

  public constructor(options: SessionContinuityOptions = {}) {
    this.options = { heartbeatIntervalMs: 30_000, ...options };
  }

  public registerDevice(
    deviceId: string,
    capabilities: readonly (string | DeviceCapability)[],
  ): Result<void> {
    const map = new Map<string, CapabilityStatus>();
    for (const capability of capabilities) {
      if (typeof capability === "string") map.set(capability, "Supported");
      else map.set(capability.capability_id, capability.status);
    }
    this.devices.set(deviceId, {
      device_id: deviceId,
      presence: "Online",
      lastHeartbeat: this.now(),
      capabilities: map,
    });
    return ok(undefined);
  }

  public heartbeat(deviceId: string, presence: PresenceState): Result<void> {
    const device = this.devices.get(deviceId);
    if (!device) return err(this.error("Device is not registered."));
    device.presence = presence;
    device.lastHeartbeat = this.now();
    return ok(undefined);
  }

  public presence(deviceId: string): PresenceState {
    const device = this.devices.get(deviceId);
    if (!device) return "Offline";
    return this.now() - device.lastHeartbeat > this.options.heartbeatIntervalMs
      ? "Offline"
      : device.presence;
  }

  public listDevices(): readonly DeviceSnapshot[] {
    return [...this.devices.values()].map((device) => ({
      device_id: device.device_id,
      presence: this.presence(device.device_id),
      capabilities: [...device.capabilities.entries()].map(([capability_id, status]) => ({
        capability_id,
        status,
      })),
    }));
  }

  public receiveMessage(sessionId: string, deviceId: string): Result<SessionState> {
    if (!this.devices.has(deviceId)) return err(this.error("Device is not registered."));
    if (this.presence(deviceId) === "Offline") return err(this.error("Device is offline."));
    const session = { session_id: sessionId, active_device_id: deviceId };
    this.sessions.set(sessionId, session);
    return ok(session);
  }

  public negotiate(
    deviceId: string,
    capabilityId: string,
  ): Result<{ device_id: string; capability_id: string; status: CapabilityStatus }> {
    const device = this.devices.get(deviceId);
    if (!device) return err(this.error("Device is not registered."));
    if (this.presence(deviceId) === "Offline") {
      return ok({ device_id: deviceId, capability_id: capabilityId, status: "Not supported" });
    }
    return ok({
      device_id: deviceId,
      capability_id: capabilityId,
      status: device.capabilities.get(capabilityId) ?? "Not supported",
    });
  }

  public updateCapability(deviceId: string, capability: DeviceCapability): Result<void> {
    const device = this.devices.get(deviceId);
    if (!device) return err(this.error("Device is not registered."));
    device.capabilities.set(capability.capability_id, capability.status);
    return ok(undefined);
  }

  public async remoteExecute<T>(
    deviceId: string,
    capabilityId: string,
    execute: () => Promise<T>,
  ): Promise<Result<T>> {
    const negotiated = this.negotiate(deviceId, capabilityId);
    if (!negotiated.ok) return negotiated;
    if (negotiated.value.status !== "Supported")
      return err(this.error(`Remote capability is ${negotiated.value.status}.`));
    try {
      return ok(await execute());
    } catch {
      this.updateCapability(deviceId, { capability_id: capabilityId, status: "Degraded" });
      return err({
        code: "NOVA-EVT001",
        message: "Remote execution failed after capability re-validation.",
        retryable: true,
      });
    }
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
