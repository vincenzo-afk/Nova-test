import { describe, expect, it } from "vitest";
import { McpServerManager, type McpServerRecord } from "../src/mcp-server-manager.js";

const server = (): McpServerRecord => ({
  server_id: "local-files",
  label: "Local files",
  state: "Discovered",
  transport: "stdio",
  command: "node",
  args: ["server.mjs"],
  auth_reference: "vault://mcp/local-files",
});

describe("McpServerManager", () => {
  it("moves a server through discovery, approval, disable, and re-enable states", () => {
    const manager = new McpServerManager();

    expect(manager.add(server())).toMatchObject({ ok: true, value: { state: "Discovered" } });
    expect(manager.requestApproval("local-files")).toMatchObject({
      ok: true,
      value: { state: "Pending approval" },
    });
    expect(manager.approve("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Connected" },
    });
    expect(manager.disable("local-files")).toMatchObject({
      ok: true,
      value: { state: "Disabled" },
    });
    expect(manager.enable("local-files")).toMatchObject({
      ok: true,
      value: { state: "Connected" },
    });
  });

  it("requires explicit approval and removal confirmation and never returns the auth reference on removal", () => {
    const manager = new McpServerManager([server()]);

    expect(manager.requestApproval("local-files")).toMatchObject({ ok: true });
    expect(manager.approve("local-files", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(manager.approve("local-files", true)).toMatchObject({ ok: true });
    expect(manager.remove("local-files", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    const removed = manager.remove("local-files", true);
    expect(removed).toEqual({ ok: true, value: { server_id: "local-files", state: "Removed" } });
    expect(JSON.stringify(removed)).not.toContain("vault://mcp/local-files");
    expect(manager.list()).toEqual([]);
  });

  it("rejects invalid transitions without mutating the lifecycle state", () => {
    const manager = new McpServerManager([server()]);

    expect(manager.enable("local-files")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(manager.list()).toMatchObject([{ server_id: "local-files", state: "Discovered" }]);
    expect(manager.requestApproval("missing")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
  });
});
