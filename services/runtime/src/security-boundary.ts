import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "@nova/shared";

export interface CredentialReference {
  readonly vault_reference: string;
}

export interface CredentialVault {
  readonly get: (vaultReference: string) => Promise<string | undefined>;
}

export class CredentialResolver {
  constructor(private readonly vault: CredentialVault) {}

  async resolve(reference: CredentialReference): Promise<Result<string>> {
    const value = await this.vault.get(reference.vault_reference);
    if (value === undefined) {
      return err({
        code: "NOVA-SEC001",
        message: "Credential vault reference is unavailable or revoked.",
        retryable: false,
        details: { vaultReference: reference.vault_reference },
      });
    }
    return ok(value);
  }

  configValue(reference: CredentialReference): CredentialReference {
    return { vault_reference: reference.vault_reference };
  }
}

export interface AuditInput {
  readonly correlation_id: string;
  readonly agent_id: string;
  readonly tool_id?: string;
  readonly execution_tier?: string;
  readonly event: string;
  readonly details: unknown;
}

export interface AuditEntry extends AuditInput {
  readonly audit_id: string;
  readonly timestamp: string;
}

export class AuditTrail {
  private readonly entries: AuditEntry[] = [];

  append(input: AuditInput): AuditEntry {
    const entry: AuditEntry = {
      ...input,
      audit_id: randomUUID(),
      timestamp: new Date().toISOString(),
      details: redactSecrets(input.details),
    };
    this.entries.push(entry);
    return entry;
  }

  query(correlationId?: string): readonly AuditEntry[] {
    return this.entries.filter(
      (entry) => correlationId === undefined || entry.correlation_id === correlationId,
    );
  }
}

const sensitiveKey = /(credential|secret|token|api[_-]?key|password|authorization|auth)/i;

const redactSecrets = (value: unknown, key?: string): unknown => {
  if (key && sensitiveKey.test(key)) {
    return "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactSecrets(entryValue, entryKey),
      ]),
    );
  }
  return value;
};
