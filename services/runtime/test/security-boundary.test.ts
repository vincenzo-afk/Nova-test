import { describe, expect, it, vi } from "vitest";
import { AuditTrail, CredentialResolver, type CredentialVault } from "../src/security-boundary.js";

describe("CredentialResolver", () => {
  it("resolves a vault reference at call time without persisting the credential value", async () => {
    const vault: CredentialVault = { get: vi.fn(async () => "super-secret") };
    const resolver = new CredentialResolver(vault);

    const result = await resolver.resolve({ vault_reference: "nova.providers.demo.api_key" });

    expect(result).toEqual({ ok: true, value: "super-secret" });
    expect(vault.get).toHaveBeenCalledWith("nova.providers.demo.api_key");
    expect(resolver.configValue({ vault_reference: "nova.providers.demo.api_key" })).toEqual({
      vault_reference: "nova.providers.demo.api_key",
    });
  });

  it("returns a stable unavailable error when the vault reference is revoked", async () => {
    const resolver = new CredentialResolver({ get: vi.fn(async () => undefined) });

    const result = await resolver.resolve({ vault_reference: "nova.providers.missing.api_key" });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });
});

describe("AuditTrail", () => {
  it("records causal metadata while redacting credential values recursively", () => {
    const audit = new AuditTrail();

    audit.append({
      correlation_id: "corr-1",
      agent_id: "agent-1",
      tool_id: "provider.demo",
      execution_tier: "api",
      event: "permission.allowed",
      details: {
        credential: "super-secret",
        nested: { api_key: "also-secret", safe: "visible" },
      },
    });

    const entries = audit.query("corr-1");
    expect(entries).toHaveLength(1);
    expect(JSON.stringify(entries[0])).not.toContain("super-secret");
    expect(JSON.stringify(entries[0])).not.toContain("also-secret");
    expect(entries[0]).toMatchObject({
      details: { credential: "[REDACTED]", nested: { api_key: "[REDACTED]", safe: "visible" } },
    });
  });
});
