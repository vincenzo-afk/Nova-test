import { describe, expect, it } from "vitest";
import { McpServerHealthTracker } from "../src/mcp-server-health.js";

describe("McpServerHealthTracker", () => {
  it("records and updates provider-style health observations without changing lifecycle data", () => {
    const tracker = new McpServerHealthTracker();

    expect(tracker.record("server-1", "reachable", "2026-08-26T05:20:00.000Z")).toEqual({
      ok: true,
      value: {
        server_id: "server-1",
        health: "reachable",
        checked_at: "2026-08-26T05:20:00.000Z",
      },
    });
    expect(tracker.record("server-1", "degraded", "2026-08-26T05:21:00.000Z")).toMatchObject({
      ok: true,
      value: { server_id: "server-1", health: "degraded" },
    });
    expect(tracker.list()).toEqual([
      {
        server_id: "server-1",
        health: "degraded",
        checked_at: "2026-08-26T05:21:00.000Z",
      },
    ]);
  });

  it("returns bounded unknown health for unobserved servers", () => {
    const tracker = new McpServerHealthTracker();

    expect(tracker.get("unobserved")).toEqual({
      ok: true,
      value: { server_id: "unobserved", health: "unknown", checked_at: null },
    });
  });

  it("rejects invalid observations and removes health on source removal", () => {
    const tracker = new McpServerHealthTracker();

    expect(tracker.record("server-1", "reachable", "not-a-date")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(tracker.record("server-1", "down", "2026-08-26T05:20:00.000Z")).toMatchObject({
      ok: true,
    });
    expect(tracker.remove("server-1")).toMatchObject({ ok: true });
    expect(tracker.get("server-1")).toMatchObject({
      ok: true,
      value: { health: "unknown", checked_at: null },
    });
  });
});
