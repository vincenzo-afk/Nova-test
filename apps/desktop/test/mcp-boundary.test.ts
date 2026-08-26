import { describe, expect, it } from "vitest";
import {
  projectMcpServer,
  projectMcpServerRemoval,
  projectMcpServers,
} from "../src/main/response-projections.js";

describe("MCP renderer boundary", () => {
  it("projects only bounded lifecycle metadata", () => {
    const server = projectMcpServer({
      server_id: "remote-search",
      label: "Remote search",
      state: "Connected",
      transport: "streamable-http",
      endpoint: "https://mcp.example.test/server",
      auth_reference: "vault://mcp/remote-search",
    });

    expect(server).toEqual({
      server_id: "remote-search",
      label: "Remote search",
      state: "Connected",
      transport: "streamable-http",
    });
    expect(JSON.stringify(server)).not.toContain("mcp.example.test");
    expect(JSON.stringify(server)).not.toContain("vault://");
  });

  it("projects lists and removal receipts without exposing configuration payloads", () => {
    expect(
      projectMcpServers([
        {
          server_id: "local-files",
          label: "Local files",
          state: "Discovered",
          transport: "stdio",
          command: "node",
          args: ["server.mjs"],
        },
      ]),
    ).toEqual([
      {
        server_id: "local-files",
        label: "Local files",
        state: "Discovered",
        transport: "stdio",
      },
    ]);
    expect(projectMcpServerRemoval({ server_id: "local-files", state: "Removed" })).toEqual({
      server_id: "local-files",
      state: "Removed",
    });
  });
});
