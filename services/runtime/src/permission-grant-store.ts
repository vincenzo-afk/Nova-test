import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";

export interface StoredPermissionGrant {
  readonly source: string;
  granted: boolean;
}

export interface PermissionGrantStoreOptions {
  readonly initial: readonly StoredPermissionGrant[];
}

export class PermissionGrantStore {
  private readonly grants = new Map<string, StoredPermissionGrant>();
  private readonly logger: StructuredLogger | undefined;

  public constructor(options: PermissionGrantStoreOptions, logger?: StructuredLogger) {
    this.logger = logger;
    for (const grant of options.initial) {
      if (!grant.source) throw new Error("Permission grant source is required.");
      if (this.grants.has(grant.source)) {
        throw new Error(`Permission grant source is duplicated: ${grant.source}.`);
      }
      this.grants.set(grant.source, { ...grant });
    }
  }

  public list(): readonly StoredPermissionGrant[] {
    return [...this.grants.values()].map((grant) => ({ ...grant }));
  }

  public update(source: string, granted: boolean): Result<StoredPermissionGrant> {
    const current = this.grants.get(source);
    if (!current) {
      this.logger?.warning("permission.update.rejected", {
        source,
        granted,
        error_code: "NOVA-SEC001",
        reason: "unknown_source",
      });
      return err(this.notFound(source));
    }
    const updated = { source: current.source, granted };
    this.grants.set(source, updated);
    this.logger?.info("permission.updated", {
      source,
      previous_granted: current.granted,
      granted,
    });
    return ok({ ...updated });
  }

  private notFound(source: string): ErrorInfo {
    return {
      code: "NOVA-SEC001",
      message: "Permission grant source is not registered.",
      retryable: false,
      details: { source },
    };
  }
}
