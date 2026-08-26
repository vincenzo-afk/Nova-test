import { describe, expect, it } from "vitest";
import type { McpPromptsListResult } from "../src/mcp-prompts-list-response.js";
import { McpPromptCache } from "../src/mcp-prompt-cache.js";

const prompts: McpPromptsListResult = {
  prompts: [
    {
      name: "summarize_document",
      title: "Summarize document",
      arguments: [{ name: "uri", required: true }],
    },
  ],
  ttl_ms: 100,
  cache_scope: "public",
  rejected_prompt_names: [],
};

describe("McpPromptCache", () => {
  it("stores prompt metadata per server and isolates caller mutations", () => {
    const cache = new McpPromptCache({ now: () => 1_000 });
    expect(cache.put("server-1", prompts)).toEqual({ ok: true, value: undefined });
    expect(cache.put("server-2", prompts)).toEqual({ ok: true, value: undefined });

    const first = cache.get("server-1");
    expect(first).toEqual({ ok: true, value: prompts });
    if (first.ok && "prompts" in first.value) {
      const argument = first.value.prompts.at(0)?.arguments?.at(0);
      if (argument) argument.name = "mutated";
    }
    expect(cache.get("server-1")).toEqual({ ok: true, value: prompts });
    expect(cache.get("server-2")).toEqual({ ok: true, value: prompts });
  });

  it("expires entries at the bounded TTL and reports a scoped miss", () => {
    let now = 1_000;
    const cache = new McpPromptCache({ now: () => now });
    cache.put("server-1", prompts);

    now = 1_100;
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
  });

  it("rejects malformed server IDs and prompt results without mutating valid entries", () => {
    const cache = new McpPromptCache({ now: () => 1_000 });
    cache.put("server-1", prompts);

    expect(cache.put("bad server", prompts)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-2", {
        prompts: [{ name: "help", arguments: [{ name: "bad argument" }] }],
        rejected_prompt_names: [],
      } as McpPromptsListResult),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(cache.get("bad server")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1")).toEqual({ ok: true, value: prompts });
    expect(
      cache.put("server-1", {
        ...prompts,
        rejected_prompt_names: [""],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
  });
});
