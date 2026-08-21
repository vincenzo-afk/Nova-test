import { describe, expect, it } from "vitest";
import { CredentialStore, type VaultBackend } from "../src/credential-store.js";

class MemoryVault implements VaultBackend {
  readonly values = new Map<string, string>();
  put(reference: string, value: string): void {
    this.values.set(reference, value);
  }
  get(reference: string): string | undefined {
    return this.values.get(reference);
  }
  delete(reference: string): void {
    this.values.delete(reference);
  }
}

describe("CredentialStore", () => {
  it("stores values only in the vault and returns an opaque reference", () => {
    const vault = new MemoryVault();
    const store = new CredentialStore(vault, () => "vault://credential-1");

    const saved = store.save({ type: "api_key", value: "super-secret" });

    expect(saved).toMatchObject({ ok: true, value: { vault_reference: "vault://credential-1" } });
    expect(JSON.stringify(saved)).not.toContain("super-secret");
    expect(vault.values.get("vault://credential-1")).toBe("super-secret");
  });

  it("resolves and rotates credentials without exposing values in metadata", () => {
    const vault = new MemoryVault();
    let sequence = 0;
    const store = new CredentialStore(vault, () => `vault://credential-${++sequence}`);
    const first = store.save({ type: "oauth", value: "token-one" });
    if (!first.ok) throw new Error(first.error.message);

    expect(store.resolve(first.value.vault_reference)).toMatchObject({
      ok: true,
      value: { type: "oauth", value: "token-one" },
    });
    const rotated = store.rotate(first.value.vault_reference, "token-two");

    expect(rotated).toMatchObject({ ok: true, value: { vault_reference: "vault://credential-2" } });
    expect(store.resolve(first.value.vault_reference)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(store.resolve("vault://credential-2")).toMatchObject({
      ok: true,
      value: { value: "token-two" },
    });
  });

  it("revokes immediately and rejects unknown or malformed references", () => {
    const vault = new MemoryVault();
    const store = new CredentialStore(vault, () => "vault://credential-1");
    const saved = store.save({ type: "api_key", value: "secret" });
    if (!saved.ok) throw new Error(saved.error.message);

    expect(store.revoke(saved.value.vault_reference)).toMatchObject({ ok: true });
    expect(store.resolve(saved.value.vault_reference)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(store.resolve("secret")).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });
});
