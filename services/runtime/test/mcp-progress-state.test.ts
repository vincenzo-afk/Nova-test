import { describe, expect, it } from "vitest";
import { McpProgressState } from "../src/mcp-progress-state.js";

describe("McpProgressState", () => {
  it("tracks progress per server and token with bounded monotonic updates", () => {
    const state = new McpProgressState();

    expect(
      state.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "task-1", progress: 2, total: 10, message: "Starting" },
      }),
    ).toEqual({
      ok: true,
      value: {
        server_id: "server-1",
        progressToken: "task-1",
        progress: 2,
        total: 10,
        message: "Starting",
      },
    });
    expect(
      state.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "task-1", progress: 5, message: "Halfway" },
      }),
    ).toEqual({
      ok: true,
      value: {
        server_id: "server-1",
        progressToken: "task-1",
        progress: 5,
        total: 10,
        message: "Halfway",
      },
    });
    expect(
      state.apply("server-2", {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "task-1", progress: 1 },
      }),
    ).toMatchObject({ ok: true, value: { server_id: "server-2", progress: 1 } });
    expect(state.get("server-1", "task-1")).toMatchObject({
      ok: true,
      value: { progress: 5, total: 10, message: "Halfway" },
    });
    expect(state.get("server-2", "task-1")).toMatchObject({
      ok: true,
      value: { progress: 1 },
    });
  });

  it("rejects regressions and progress beyond total without mutating the prior snapshot", () => {
    const state = new McpProgressState();
    state.apply("server-1", {
      jsonrpc: "2.0",
      method: "notifications/progress",
      params: { progressToken: 7, progress: 5, total: 10 },
    });

    expect(
      state.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: 7, progress: 4, total: 10 },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      state.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: 7, progress: 11, total: 10 },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(state.get("server-1", 7)).toMatchObject({
      ok: true,
      value: { progress: 5, total: 10 },
    });
  });

  it("fails closed on non-string server IDs without throwing", () => {
    const state = new McpProgressState();
    const invalidServerId = Symbol("server") as unknown as string;
    const notification = {
      jsonrpc: "2.0",
      method: "notifications/progress",
      params: { progressToken: "task-1", progress: 0 },
    };

    expect(() => state.apply(invalidServerId, notification)).not.toThrow();
    expect(state.apply(invalidServerId, notification)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(state.get("server-1", "task-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", progressToken: "task-1", status: "miss" },
    });
  });

  it("fails closed on malformed server IDs and notifications without mutating state", () => {
    const state = new McpProgressState();
    expect(state.apply("bad server", {})).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      state.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "task-1", progress: 0 },
      }),
    ).toEqual({
      ok: true,
      value: { server_id: "server-1", progressToken: "task-1", progress: 0 },
    });
    expect(
      state.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "task-1", progress: 1 },
      }),
    ).toEqual({
      ok: true,
      value: { server_id: "server-1", progressToken: "task-1", progress: 1 },
    });
  });
});
