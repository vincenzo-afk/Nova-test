import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { McpToolsListResult } from "../src/mcp-tools-list-response.js";
import { McpToolCache } from "../src/mcp-tool-cache.js";
import { McpServerLocalStateCleanup } from "../src/mcp-server-local-state-cleanup.js";
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
  it("rejects duplicate initial server IDs instead of silently overwriting", () => {
    const initial = server();
    expect(() => new McpServerManager([initial, { ...initial, label: "Duplicate label" }])).toThrow(
      "MCP server IDs must be unique.",
    );
  });

  it("fails closed on non-serializable records without mutating configured state", () => {
    const manager = new McpServerManager([server()]);
    const circularArgs: unknown[] = ["server.mjs"];
    circularArgs.push(circularArgs);
    const nonSerializable = {
      ...server(),
      server_id: "circular-server",
      args: circularArgs as readonly string[],
    };

    expect(() => manager.add(nonSerializable)).not.toThrow();
    expect(manager.add(nonSerializable)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(() => manager.replace([nonSerializable])).not.toThrow();
    expect(manager.replace([nonSerializable])).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(manager.list()).toEqual([server()]);
  });

  it("moves a server through discovery, approval, disable, and re-enable states", () => {
    const manager = new McpServerManager();

    expect(manager.add(server())).toMatchObject({ ok: true, value: { state: "Discovered" } });
    expect(manager.requestApproval("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Pending approval" },
    });
    expect(manager.approve("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Connected" },
    });
    expect(manager.disable("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Disabled" },
    });
    expect(manager.enable("local-files", true)).toMatchObject({
      ok: true,
      value: { state: "Connected" },
    });
  });

  it("requires explicit approval and removal confirmation and never returns the auth reference on removal", () => {
    const manager = new McpServerManager([server()]);

    expect(manager.requestApproval("local-files", true)).toMatchObject({ ok: true });
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

  it("clears server-scoped local MCP state before completing a confirmed removal", () => {
    const toolsCache = new McpToolCache({ now: () => 1_000 });
    const cleanup = new McpServerLocalStateCleanup({ toolsCache });
    const manager = new McpServerManager([server()], cleanup);
    const tools: McpToolsListResult = {
      tools: [{ name: "read", inputSchema: { type: "object" } }],
      rejected_tool_names: [],
    };
    toolsCache.put("local-files", tools);

    expect(manager.remove("local-files", true)).toEqual({
      ok: true,
      value: { server_id: "local-files", state: "Removed" },
    });
    expect(toolsCache.get("local-files")).toEqual({
      ok: true,
      value: { server_id: "local-files", status: "miss" },
    });
  });

  it("rejects duplicate server IDs during replacement without mutation", () => {
    const initial = server();
    const manager = new McpServerManager([initial]);
    const duplicate = { ...initial, label: "Duplicate label" };

    expect(manager.replace([initial, duplicate])).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(manager.list()).toEqual([initial]);
  });

  it("clears only removed servers when replacing configured records", () => {
    const retained = { ...server(), server_id: "retained" };
    const clear = vi.fn(() => ({
      ok: true as const,
      value: { server_id: "local-files", status: "cleared" as const },
    }));
    const manager = new McpServerManager([server(), retained], { clear });

    expect(manager.replace([retained])).toEqual({ ok: true, value: undefined });
    expect(clear).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledWith("local-files");
    expect(manager.list()).toEqual([retained]);
  });

  it("keeps the prior records when replacement cleanup fails", () => {
    const failure = {
      ok: false as const,
      error: { code: "NOVA-RUN001", message: "cleanup failed", retryable: false },
    };
    const clear = vi.fn(() => failure);
    const manager = new McpServerManager([server()], { clear });

    expect(manager.replace([])).toEqual(failure);
    expect(manager.list()).toEqual([server()]);
    expect(clear).toHaveBeenCalledWith("local-files");
  });

  it("rejects invalid transitions without mutating the lifecycle state", () => {
    const manager = new McpServerManager([server()]);

    expect(manager.enable("local-files", true)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(manager.list()).toMatchObject([{ server_id: "local-files", state: "Discovered" }]);
    expect(manager.requestApproval("missing", true)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
  });
});
