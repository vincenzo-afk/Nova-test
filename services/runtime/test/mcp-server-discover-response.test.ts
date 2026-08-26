import { describe, expect, it } from "vitest";
import { McpServerDiscoverResponseValidator } from "../src/mcp-server-discover-response.js";

describe("McpServerDiscoverResponseValidator", () => {
  it("normalizes a correlated discovery response and preserves only bounded metadata", () => {
    const validator = new McpServerDiscoverResponseValidator();

    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: "discover-1",
          result: {
            resultType: "complete",
            supportedVersions: ["2026-07-28", "2025-11-25"],
            capabilities: { tools: {}, resources: { subscribe: true } },
            _meta: {
              "io.modelcontextprotocol/serverInfo": {
                name: "ExampleServer",
                version: "2.0.0",
                endpoint: "https://secret.example.test",
              },
              secret: "not forwarded",
            },
            instructions: "Use the weather tools.",
            ttlMs: 3_600_000,
            cacheScope: "public",
            ignored: "not forwarded",
          },
        },
        "discover-1",
      ),
    ).toEqual({
      ok: true,
      value: {
        supported_versions: ["2026-07-28", "2025-11-25"],
        capabilities: { tools: {}, resources: { subscribe: true } },
        server_info: { name: "ExampleServer", version: "2.0.0" },
        instructions: "Use the weather tools.",
        ttl_ms: 3_600_000,
        cache_scope: "public",
      },
    });
  });

  it("deep-clones capabilities and accepts discovery responses without optional metadata", () => {
    const validator = new McpServerDiscoverResponseValidator();
    const capabilities = { prompts: {} };
    const response = {
      jsonrpc: "2.0",
      id: 7,
      result: {
        resultType: "complete",
        supportedVersions: ["2026-07-28"],
        capabilities,
      },
    };

    const parsed = validator.parse(response, 7);
    capabilities.prompts = { listChanged: true };

    expect(parsed).toEqual({
      ok: true,
      value: { supported_versions: ["2026-07-28"], capabilities: { prompts: {} } },
    });
  });

  it("rejects mismatched IDs, errors, malformed versions, capabilities, identity, and cache metadata", () => {
    const validator = new McpServerDiscoverResponseValidator();
    const base = {
      jsonrpc: "2.0",
      id: 1,
      result: { resultType: "complete", supportedVersions: ["2026-07-28"], capabilities: {} },
    };

    expect(validator.parse(base, 2)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, error: { code: -1, message: "failed" } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({ ...base, result: { ...base.result, supportedVersions: [] } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({ ...base, result: { ...base.result, capabilities: "invalid" } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse(
        {
          ...base,
          result: {
            ...base.result,
            _meta: { "io.modelcontextprotocol/serverInfo": { name: "Server" } },
          },
        },
        1,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(validator.parse({ ...base, result: { ...base.result, ttlMs: 0 } }, 1)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ ...base, result: { ...base.result, cacheScope: "secret" } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
