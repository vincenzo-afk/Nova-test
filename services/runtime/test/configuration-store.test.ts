import { describe, expect, it, vi } from "vitest";
import { ConfigurationStore, type NovaConfiguration } from "../src/configuration-store.js";

const base = (): NovaConfiguration => ({
  schema_version: "1.0.0",
  capabilities: {},
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: { enabled: false, wake_word: "nova", always_listening: false },
  personalization: {},
});

describe("ConfigurationStore", () => {
  it("starts with a versioned local-first configuration and writes valid sections atomically", () => {
    const store = new ConfigurationStore({
      initial: base(),
      availableProviderIds: new Set(["local.llm"]),
    });
    const changed = vi.fn();
    store.subscribe(changed);

    expect(store.snapshot()).toMatchObject({ schema_version: "1.0.0", capabilities: {} });
    expect(store.update("routing_policies", { llm: { policy: "privacy-first" } })).toMatchObject({
      ok: true,
    });
    expect(store.snapshot().routing_policies).toEqual({ llm: { policy: "privacy-first" } });
    expect(changed).toHaveBeenCalledOnce();
  });

  it("rejects invalid updates with field-level errors without partial mutation", () => {
    const store = new ConfigurationStore({
      initial: base(),
      availableProviderIds: new Set(["local.llm"]),
    });
    const before = store.snapshot();

    const result = store.update("routing_policies", {
      llm: { policy: "manual", manual_override: "missing" },
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(store.snapshot()).toEqual(before);
  });

  it("accepts credential vault references but rejects inline credential values", () => {
    const store = new ConfigurationStore({ initial: base() });

    expect(
      store.update("channels", [
        { channel_id: "mail", credential: { vault_reference: "vault://mail-token" } },
      ]),
    ).toMatchObject({ ok: true });
    expect(
      store.update("channels", [{ channel_id: "mail", credential: { token: "secret-value" } }]),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
  });

  it("exports without credential values and imports with missing-provider warnings", () => {
    const store = new ConfigurationStore({
      initial: base(),
      availableProviderIds: new Set(["local.llm"]),
    });
    store.update("routing_policies", { llm: { policy: "manual", manual_override: "local.llm" } });
    const exported = store.export();
    expect(exported).not.toContain("secret");

    const target = new ConfigurationStore({ initial: base(), availableProviderIds: new Set() });
    const imported = target.import(exported);

    expect(imported).toMatchObject({
      ok: true,
      value: { warnings: [{ section: "routing_policies" }] },
    });
    expect(target.snapshot().routing_policies).toEqual({});
  });

  it("rejects unsupported schema versions", () => {
    const store = new ConfigurationStore({ initial: base() });
    const result = store.import(JSON.stringify({ ...base(), schema_version: "2.0.0" }));

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
  });
});
