import { describe, expect, it } from "vitest";
import { McpTransportPlanner } from "../src/mcp-transport-planner.js";
import type { McpServerConfiguration } from "../src/configuration-store.js";

const base = {
  server_id: "server-1",
  label: "Test server",
  state: "Discovered" as const,
};

describe("McpTransportPlanner", () => {
  it("selects stdio deterministically for a local command", () => {
    const planner = new McpTransportPlanner();
    const server: McpServerConfiguration = {
      ...base,
      transport: "stdio",
      command: "nova-mcp",
      args: ["--safe"],
    };

    expect(planner.plan(server)).toEqual({
      ok: true,
      value: {
        transport: "stdio",
        command: "nova-mcp",
        args: ["--safe"],
      },
    });
  });

  it("selects Streamable HTTP deterministically for a safe remote endpoint", () => {
    const planner = new McpTransportPlanner();
    const server: McpServerConfiguration = {
      ...base,
      transport: "streamable-http",
      endpoint: "https://mcp.example.test/server",
      auth_reference: "vault://mcp/server-1",
    };

    expect(planner.plan(server)).toEqual({
      ok: true,
      value: {
        transport: "streamable-http",
        endpoint: "https://mcp.example.test/server",
        auth_reference: "vault://mcp/server-1",
      },
    });
  });

  it("rejects mixed or unsafe forms instead of falling back to another transport", () => {
    const planner = new McpTransportPlanner();

    expect(
      planner.plan({
        ...base,
        transport: "stdio",
        command: "nova-mcp",
        endpoint: "https://mcp.example.test/server",
      } as McpServerConfiguration),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      planner.plan({
        ...base,
        transport: "streamable-http",
        endpoint: "http://remote.example.test/server",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      planner.plan({
        ...base,
        transport: "streamable-http",
        command: "nova-mcp",
      } as McpServerConfiguration),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
  });
});
