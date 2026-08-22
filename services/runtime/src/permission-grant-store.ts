import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface StoredPermissionGrant {
  readonly source: string;
  granted: boolean;
}

export interface PermissionGrantStoreOptions {
  readonly initial: readonly StoredPermissionGrant[];
}

export class PermissionGrantStore {
  private readonly grants = new Map<string, StoredPermissionGrant>();

  public constructor(options: PermissionGrantStoreOptions) {
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
    if (!current) return err(this.notFound(source));
    const updated = { source: current.source, granted };
    this.grants.set(source, updated);
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
