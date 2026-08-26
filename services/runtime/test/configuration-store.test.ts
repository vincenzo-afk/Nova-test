import { describe, expect, it, vi } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  ConfigurationStore,
  type McpServerConfiguration,
  type NovaConfiguration,
} from "../src/configuration-store.js";
import { McpToolCache } from "../src/mcp-tool-cache.js";
import { McpServerLocalStateCleanup } from "../src/mcp-server-local-state-cleanup.js";

const capability = () => ({
  capability_id: "llm",
  domain: "text-generation",
  required: true,
  providers: [
    {
      provider_id: "local.llm",
      enabled: true,
      priority: 1,
      credential: { vault_reference: "vault://local-llm" },
    },
  ],
  active_policy: "manual",
  manual_override: "local.llm",
});

const personalization = () => ({
  preferences: [
    {
      id: "tone.concise",
      category: "tone",
      value: { style: "concise" },
      enabled: true,
      source: "user",
      updated_at: "2026-08-23T00:00:00.000Z",
    },
  ],
});

const base = (): NovaConfiguration => ({
  schema_version: "1.0.0",
  capabilities: {},
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: {
    enabled: false,
    wake_word: "nova",
    always_listening: false,
    barge_in_sensitivity: "conservative",
  },
  personalization: { preferences: [] },
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

  it("audits valid writes with bounded metadata and never logs configuration payloads", () => {
    const sink = new MemoryLogSink();
    const store = new ConfigurationStore({
      initial: base(),
      logger: new StructuredLogger({ service: "runtime.configuration", sink }),
    });

    expect(
      store.update("channels", [{ credential: { vault_reference: "vault://mail-token" } }]),
    ).toMatchObject({
      ok: true,
    });

    const record = sink.records().at(-1);
    expect(record?.event).toBe("configuration.updated");
    expect(record?.details).toMatchObject({ section: "channels" });
    expect(JSON.stringify(sink.records())).not.toContain("vault://mail-token");
  });

  it("audits rejected writes without logging invalid values", () => {
    const sink = new MemoryLogSink();
    const store = new ConfigurationStore({
      initial: base(),
      logger: new StructuredLogger({ service: "runtime.configuration", sink }),
    });

    expect(
      store.update("channels", [{ credential: { token: "super-secret-value" } }]),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });

    expect(sink.records().at(-1)?.event).toBe("configuration.update.rejected");
    expect(sink.records().at(-1)?.details).toMatchObject({
      section: "channels",
      error_code: "NOVA-CFG001",
    });
    expect(JSON.stringify(sink.records())).not.toContain("super-secret-value");
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

  it("persists a typed voice configuration with local wake-word settings", () => {
    const store = new ConfigurationStore({ initial: base() });
    const voice = {
      enabled: true,
      wake_word: "computer",
      always_listening: true,
      barge_in_sensitivity: "aggressive" as const,
    };

    expect(store.update("voice", voice)).toMatchObject({ ok: true });
    expect(store.snapshot().voice).toEqual(voice);
  });

  it("rejects invalid voice settings atomically", () => {
    const store = new ConfigurationStore({ initial: base() });
    const before = store.snapshot();

    expect(
      store.update("voice", {
        enabled: true,
        wake_word: "",
        always_listening: "yes",
        barge_in_sensitivity: "balanced",
      } as never),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(store.snapshot()).toEqual(before);
  });

  it("persists validated browser excluded-domain rules", () => {
    const store = new ConfigurationStore({ initial: base() });

    const result = store.update("permissions", {
      browser_excluded_domains: ["example.com", "*.private.test", "localhost"],
    });

    expect(result).toMatchObject({ ok: true });
    expect(store.snapshot().permissions).toEqual({
      browser_excluded_domains: ["example.com", "*.private.test", "localhost"],
    });
  });

  it("rejects malformed browser excluded-domain rules without mutation", () => {
    const store = new ConfigurationStore({
      initial: { ...base(), permissions: { browser_excluded_domains: ["example.com"] } },
    });
    const before = store.snapshot();

    const result = store.update("permissions", {
      browser_excluded_domains: ["https://example.com/path", "*.", "bad domain"],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(store.snapshot()).toEqual(before);
  });

  it("persists MCP lifecycle transitions through the configuration boundary", () => {
    const initialServer: McpServerConfiguration = {
      server_id: "local-files",
      label: "Local files",
      state: "Discovered",
      transport: "stdio",
      command: "node",
      args: ["server.mjs"],
    };
    const store = new ConfigurationStore({ initial: { ...base(), mcp_servers: [initialServer] } });

    expect(store.requestMcpServerApproval("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Pending approval" },
    });
    expect(store.approveMcpServer("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Connected" },
    });
    expect(store.disableMcpServer("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Disabled" },
    });
    expect(store.enableMcpServer("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Connected" },
    });
    expect(store.removeMcpServer("local-files", true)).toEqual({
      ok: true,
      value: { server_id: "local-files", state: "Removed" },
    });
    expect(store.snapshot().mcp_servers).toEqual([]);
  });

  it("clears removed server state during validated MCP configuration replacement", () => {
    const initialServer: McpServerConfiguration = {
      server_id: "local-files",
      label: "Local files",
      state: "Discovered",
      transport: "stdio",
      command: "node",
    };
    const toolsCache = new McpToolCache({ now: () => 1_000 });
    const cleanup = new McpServerLocalStateCleanup({ toolsCache });
    const store = new ConfigurationStore({
      initial: { ...base(), mcp_servers: [initialServer] },
      mcpServerLocalStateCleanup: cleanup,
    });
    toolsCache.put("local-files", {
      tools: [{ name: "read", inputSchema: { type: "object" } }],
      rejected_tool_names: [],
    });

    expect(store.update("mcp_servers", [])).toEqual({ ok: true, value: undefined });
    expect(toolsCache.get("local-files")).toEqual({
      ok: true,
      value: { server_id: "local-files", status: "miss" },
    });
  });

  it("keeps imported configuration unchanged when removed server cleanup fails", () => {
    const initialServer: McpServerConfiguration = {
      server_id: "local-files",
      label: "Local files",
      state: "Discovered",
      transport: "stdio",
      command: "node",
    };
    const cleanupFailure = {
      ok: false as const,
      error: { code: "NOVA-RUN001", message: "cleanup failed", retryable: false },
    };
    const store = new ConfigurationStore({
      initial: { ...base(), mcp_servers: [initialServer] },
      mcpServerLocalStateCleanup: { clear: () => cleanupFailure },
    });

    expect(store.import(JSON.stringify(base()))).toEqual(cleanupFailure);
    expect(store.snapshot().mcp_servers).toEqual([initialServer]);
  });

  it("rejects invalid MCP additions without mutating the authoritative configuration", () => {
    const store = new ConfigurationStore({ initial: base() });
    const before = store.snapshot();

    expect(
      store.addMcpServer({
        server_id: "unsafe",
        label: "Unsafe",
        state: "Discovered",
        transport: "streamable-http",
        endpoint: "http://remote.example.test/server",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(store.snapshot()).toEqual(before);
  });

  it("accepts documented MCP server connection records with deterministic transports", () => {
    const store = new ConfigurationStore({ initial: base() });
    const servers = [
      {
        server_id: "local-files",
        label: "Local files",
        state: "Discovered",
        transport: "stdio",
        command: "node",
        args: ["server.mjs"],
        auth_reference: "vault://mcp/local-files",
      },
      {
        server_id: "remote-search",
        label: "Remote search",
        state: "Pending approval",
        transport: "streamable-http",
        endpoint: "https://mcp.example.test/server",
      },
    ];

    expect(store.update("mcp_servers", servers)).toMatchObject({ ok: true });
    expect(store.snapshot().mcp_servers).toEqual(servers);
  });

  it("rejects ambiguous MCP transports, unsafe endpoints, and inline authentication values atomically", () => {
    const store = new ConfigurationStore({ initial: base() });
    const before = store.snapshot();

    expect(
      store.update("mcp_servers", [
        {
          server_id: "ambiguous",
          label: "Ambiguous",
          state: "Discovered",
          transport: "stdio",
          command: "node",
          endpoint: "https://mcp.example.test/server",
        },
      ]),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(store.snapshot()).toEqual(before);

    expect(
      store.update("mcp_servers", [
        {
          server_id: "unsafe-url",
          label: "Unsafe URL",
          state: "Discovered",
          transport: "streamable-http",
          endpoint: "https://user:password@mcp.example.test/server",
        },
      ]),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });

    expect(
      store.update("mcp_servers", [
        {
          server_id: "inline-secret",
          label: "Inline secret",
          state: "Discovered",
          transport: "streamable-http",
          endpoint: "https://mcp.example.test/server",
          auth_reference: "secret-token",
        },
      ]),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
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

  it("audits personalization resets and imports with bounded metadata", () => {
    const sink = new MemoryLogSink();
    const store = new ConfigurationStore({
      initial: { ...base(), personalization: personalization() },
      logger: new StructuredLogger({ service: "runtime.configuration", sink }),
    });

    expect(store.resetPersonalization("tone.concise")).toMatchObject({ ok: true });
    expect(sink.records().at(-1)?.event).toBe("configuration.personalization.reset");
    expect(sink.records().at(-1)?.details).toMatchObject({ scope: "single" });

    const imported = store.import(JSON.stringify(base()));
    expect(imported).toMatchObject({ ok: true });
    expect(sink.records().at(-1)?.event).toBe("configuration.imported");
    expect(sink.records().at(-1)?.details).toMatchObject({
      schema_version: "1.0.0",
      warning_count: 0,
    });
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

  it("accepts documented capability provider records with vault-only credentials", () => {
    const store = new ConfigurationStore({
      initial: base(),
      availableProviderIds: new Set(["local.llm"]),
    });

    expect(store.update("capabilities", { llm: capability() })).toMatchObject({ ok: true });
    expect(store.snapshot().capabilities).toEqual({ llm: capability() });
  });

  it("rejects malformed capability records atomically", () => {
    const store = new ConfigurationStore({ initial: base() });
    const before = store.snapshot();

    const result = store.update("capabilities", {
      llm: { capability_id: "llm", providers: [{ provider_id: "local.llm" }] },
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(store.snapshot()).toEqual(before);
  });

  it("stores visible personalization records and can reset one or all records", () => {
    const store = new ConfigurationStore({ initial: base() });

    expect(store.update("personalization", personalization())).toMatchObject({ ok: true });
    expect(store.snapshot().personalization).toEqual(personalization());
    expect(store.resetPersonalization("tone.concise")).toMatchObject({ ok: true });
    expect(store.snapshot().personalization).toEqual({ preferences: [] });
    expect(store.update("personalization", personalization())).toMatchObject({ ok: true });
    expect(store.resetPersonalization()).toMatchObject({ ok: true });
    expect(store.snapshot().personalization).toEqual({ preferences: [] });
  });

  it("rejects hidden or inline personalization secrets", () => {
    const store = new ConfigurationStore({ initial: base() });

    const result = store.update("personalization", {
      preferences: [{ ...personalization().preferences[0], value: { api_key: "secret" } }],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
  });

  it("rejects unsupported schema versions", () => {
    const store = new ConfigurationStore({ initial: base() });
    const result = store.import(JSON.stringify({ ...base(), schema_version: "2.0.0" }));

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
  });
});
