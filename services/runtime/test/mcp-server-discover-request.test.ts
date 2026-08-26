import { describe, expect, it } from "vitest";
import { McpServerDiscoverRequestBuilder } from "../src/mcp-server-discover-request.js";

describe("McpServerDiscoverRequestBuilder", () => {
  it("builds a fixed server/discover request with required modern metadata", () => {
    const builder = new McpServerDiscoverRequestBuilder();

    expect(
      builder.create({
        protocolVersion: "2026-07-28",
        clientInfo: { name: "Nova", version: "1.0.0" },
        clientCapabilities: { roots: {} },
      }),
    ).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "server/discover",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientInfo": { name: "Nova", version: "1.0.0" },
            "io.modelcontextprotocol/clientCapabilities": { roots: {} },
          },
        },
      },
    });
  });

  it("deep-clones caller-owned metadata and forwards no unknown fields", () => {
    const builder = new McpServerDiscoverRequestBuilder();
    const clientCapabilities = { roots: {} };
    const result = builder.create({
      protocolVersion: "2026-07-28",
      clientInfo: { name: "Nova", version: "1.0.0" },
      clientCapabilities,
      ignored: "not forwarded",
    });
    clientCapabilities.roots = { listChanged: true };

    expect(result).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "server/discover",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientInfo": { name: "Nova", version: "1.0.0" },
            "io.modelcontextprotocol/clientCapabilities": { roots: {} },
          },
        },
      },
    });
  });

  it("rejects malformed versions, client identity, capabilities, and oversized input before consuming an ID", () => {
    const builder = new McpServerDiscoverRequestBuilder();

    expect(
      builder.create({
        protocolVersion: "",
        clientInfo: { name: "Nova", version: "1.0.0" },
        clientCapabilities: {},
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      builder.create({
        protocolVersion: "2026-07-28",
        clientInfo: { name: "Nova" },
        clientCapabilities: {},
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      builder.create({
        protocolVersion: "2026-07-28",
        clientInfo: { name: "Nova", version: "1.0.0" },
        clientCapabilities: "invalid",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      builder.create({
        protocolVersion: "2026-07-28",
        clientInfo: { name: "N".repeat(257), version: "1.0.0" },
        clientCapabilities: {},
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      builder.create({
        protocolVersion: "2026-07-28",
        clientInfo: { name: "Nova", version: "1.0.0" },
        clientCapabilities: {},
      }),
    ).toMatchObject({ ok: true, value: { id: 1 } });
  });
});
