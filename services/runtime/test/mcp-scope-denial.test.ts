import { describe, expect, it } from "vitest";
import { McpScopeDenialNormalizer } from "../src/mcp-scope-denial.js";

describe("McpScopeDenialNormalizer", () => {
  it("surfaces missing scopes as a capability-unavailable re-authorization action", () => {
    const normalizer = new McpScopeDenialNormalizer();

    expect(
      normalizer.normalize("server-1", "calendar.list", ["calendar.read", "calendar.write"]),
    ).toEqual({
      ok: true,
      value: {
        server_id: "server-1",
        tool_name: "calendar.list",
        status: "capability-unavailable",
        action: "reauthorize",
        missing_scopes: ["calendar.read", "calendar.write"],
        retryable: false,
      },
    });
  });

  it("does not expose credentials or permit same-credential retries", () => {
    const normalizer = new McpScopeDenialNormalizer();
    const result = normalizer.normalize("server-1", "calendar.list", ["calendar.read"]);

    expect(JSON.stringify(result)).not.toContain("token");
    expect(result).toMatchObject({
      ok: true,
      value: { status: "capability-unavailable", action: "reauthorize", retryable: false },
    });
  });

  it("rejects malformed, duplicate, or unbounded scope metadata", () => {
    const normalizer = new McpScopeDenialNormalizer();

    expect(normalizer.normalize("server-1", "calendar.list", [])).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      normalizer.normalize("server-1", "calendar.list", ["calendar.read", "calendar.read"]),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      normalizer.normalize(
        "server-1",
        "calendar.list",
        Array.from({ length: 33 }, (_, index) => `scope-${index}`),
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
  });
});
