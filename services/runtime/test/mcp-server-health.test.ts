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

  it("rejects new observations beyond the bounded record capacity without mutation", () => {
    const tracker = new McpServerHealthTracker();
    for (let index = 0; index < 128; index += 1) {
      expect(
        tracker.record(`server-${index}`, "reachable", "2026-08-26T05:20:00.000Z"),
      ).toMatchObject({ ok: true });
    }

    expect(tracker.record("server-0", "down", "2026-08-26T05:21:00.000Z")).toMatchObject({
      ok: true,
      value: { server_id: "server-0", health: "down" },
    });
    expect(tracker.record("server-over-capacity", "reachable", "2026-08-26T05:20:00.000Z")).toEqual(
      {
        ok: false,
        error: {
          code: "NOVA-CFG001",
          message: "MCP health observation capacity has been reached.",
          retryable: false,
        },
      },
    );
    expect(tracker.get("server-127")).toMatchObject({ ok: true, value: { health: "reachable" } });
    expect(tracker.get("server-over-capacity")).toMatchObject({
      ok: true,
      value: { health: "unknown", checked_at: null },
    });
  });

  it("returns bounded unknown health for unobserved servers", () => {
    const tracker = new McpServerHealthTracker();

    expect(tracker.get("unobserved")).toEqual({
      ok: true,
      value: { server_id: "unobserved", health: "unknown", checked_at: null },
    });
  });

  it("rejects non-canonical health timestamps", () => {
    const tracker = new McpServerHealthTracker();

    expect(tracker.record("server-1", "reachable", "2026-08-26 05:20:00")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(tracker.record("server-1", "reachable", "2026-08-26T05:20:00.000Z")).toMatchObject({
      ok: true,
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
