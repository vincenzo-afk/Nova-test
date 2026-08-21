import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type CompanionPermissionState = "Granted" | "Revoked";
export type CompanionUseStatus = "Available";

export interface CompanionCapability {
  readonly capability_id: string;
  readonly required_permissions: readonly string[];
}

export class AndroidCompanionManager {
  private readonly permissions = new Map<string, CompanionPermissionState>();
  private foregroundService = false;

  public constructor(
    private readonly deviceId: string,
    advertisedPermissions: readonly string[],
  ) {
    for (const permission of advertisedPermissions) this.permissions.set(permission, "Revoked");
  }

  public grant(permission: string): Result<void> {
    if (!this.permissions.has(permission))
      return err(this.error("Permission is not advertised by this companion."));
    this.permissions.set(permission, "Granted");
    return ok(undefined);
  }

  public revoke(permission: string): Result<void> {
    if (!this.permissions.has(permission))
      return err(this.error("Permission is not advertised by this companion."));
    this.permissions.set(permission, "Revoked");
    return ok(undefined);
  }

  public permission(permission: string): CompanionPermissionState {
    return this.permissions.get(permission) ?? "Revoked";
  }

  public use(
    capability: CompanionCapability,
  ): Result<{ status: CompanionUseStatus; device_id: string }> {
    for (const permission of capability.required_permissions) {
      if (this.permission(permission) !== "Granted")
        return err(
          this.securityError(
            `Capability ${capability.capability_id} lacks permission ${permission}.`,
          ),
        );
    }
    return ok({ status: "Available", device_id: this.deviceId });
  }

  public startForegroundService(): void {
    this.foregroundService = true;
  }

  public stopForegroundService(): void {
    this.foregroundService = false;
  }

  public startBackground(capabilityId: string): Result<void> {
    if (!this.foregroundService)
      return err(
        this.securityError(`Background ${capabilityId} requires a visible foreground service.`),
      );
    return ok(undefined);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-AI002", message, retryable: false };
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
