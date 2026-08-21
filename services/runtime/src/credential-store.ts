import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type CredentialType =
  "api_key" | "oauth" | "bot_token" | "device_pairing_key" | "remote_access";

export interface VaultBackend {
  put(reference: string, value: string): void;
  get(reference: string): string | undefined;
  delete(reference: string): void;
}

export interface CredentialInput {
  readonly type: CredentialType;
  readonly value: string;
}

export interface CredentialReference {
  readonly vault_reference: string;
}

export interface StoredCredential {
  readonly type: CredentialType;
  readonly value: string;
}

export class CredentialStore {
  private readonly references = new Map<string, CredentialType>();

  public constructor(
    private readonly vault: VaultBackend,
    private readonly referenceFactory: () => string,
  ) {}

  public save(input: CredentialInput): Result<CredentialReference> {
    if (!input.value || !input.type)
      return err(this.securityError("Credential type and value are required."));
    const reference = this.referenceFactory();
    if (!reference.startsWith("vault://"))
      return err(this.securityError("Credential references must use the vault:// scheme."));
    this.vault.put(reference, input.value);
    this.references.set(reference, input.type);
    return ok({ vault_reference: reference });
  }

  public resolve(reference: string): Result<StoredCredential> {
    const type = this.references.get(reference);
    const value = reference.startsWith("vault://") ? this.vault.get(reference) : undefined;
    if (!type || value === undefined)
      return err(this.securityError("Credential reference is revoked or unavailable."));
    return ok({ type, value });
  }

  public rotate(reference: string, replacement: string): Result<CredentialReference> {
    const current = this.references.get(reference);
    if (!current || this.vault.get(reference) === undefined)
      return err(this.securityError("Credential reference is revoked or unavailable."));
    this.revoke(reference);
    return this.save({ type: current, value: replacement });
  }

  public revoke(reference: string): Result<void> {
    if (!this.references.has(reference))
      return err(this.securityError("Credential reference is revoked or unavailable."));
    this.references.delete(reference);
    this.vault.delete(reference);
    return ok(undefined);
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
