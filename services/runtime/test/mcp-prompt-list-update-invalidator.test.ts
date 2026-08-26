import { describe, expect, it } from "vitest";
import type { McpPromptsListResult } from "../src/mcp-prompts-list-response.js";
import { McpPromptCache } from "../src/mcp-prompt-cache.js";
import { McpPromptListUpdateInvalidator } from "../src/mcp-prompt-list-update-invalidator.js";

const prompts: McpPromptsListResult = {
  prompts: [{ name: "help", description: "Observed metadata" }],
  ttl_ms: 5_000,
  cache_scope: "public",
  rejected_prompt_names: [],
};

describe("McpPromptListUpdateInvalidator", () => {
  it("invalidates only the notified server's prompt listing", () => {
    const cache = new McpPromptCache({ now: () => 1_000 });
    const invalidator = new McpPromptListUpdateInvalidator(cache);

    cache.put("server-1", prompts);
    cache.put("server-2", prompts);

    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/prompts/list_changed",
      }),
    ).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "invalidated" },
    });
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
    expect(cache.get("server-2")).toEqual({ ok: true, value: prompts });
  });

  it("rejects other capabilities, malformed notifications, and server IDs without mutation", () => {
    const cache = new McpPromptCache({ now: () => 1_000 });
    const invalidator = new McpPromptListUpdateInvalidator(cache);
    cache.put("server-1", prompts);

    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        id: 1,
        method: "notifications/prompts/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      invalidator.apply("bad server", {
        jsonrpc: "2.0",
        method: "notifications/prompts/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(cache.get("server-1")).toEqual({ ok: true, value: prompts });
  });
});
