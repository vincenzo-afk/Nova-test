import { describe, expect, it } from "vitest";
import { McpProtocolVersionNegotiator } from "../src/mcp-protocol-version.js";

describe("McpProtocolVersionNegotiator", () => {
  it("selects the highest mutually supported dated protocol version", () => {
    const negotiator = new McpProtocolVersionNegotiator();

    expect(
      negotiator.select(["2025-06-18", "2025-11-25", "2026-07-28"], ["2025-11-25", "2026-07-28"]),
    ).toEqual({
      ok: true,
      value: "2026-07-28",
    });
  });

  it("rejects an incompatible version set without inventing a fallback", () => {
    const negotiator = new McpProtocolVersionNegotiator();

    expect(negotiator.select(["2026-07-28"], ["2025-11-25"])).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });

  it("rejects malformed, duplicate, or unbounded version lists", () => {
    const negotiator = new McpProtocolVersionNegotiator();

    expect(negotiator.select(["not-a-version"], ["2026-07-28"])).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(negotiator.select(["2026-07-28", "2026-07-28"], ["2026-07-28"])).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      negotiator.select(
        Array.from({ length: 65 }, (_, index) => `2026-07-${String(index + 1).padStart(2, "0")}`),
        ["2026-07-28"],
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
