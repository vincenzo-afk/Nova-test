import { describe, expect, it } from "vitest";
import type { McpPromptListResult } from "../src/mcp-prompts-list-response.js";
import type { McpResourcesListResult } from "../src/mcp-resources-list-response.js";
import type { McpResourcesTemplatesListResult } from "../src/mcp-resources-templates-list-response.js";
import type { McpServerDiscoverResult } from "../src/mcp-server-discover-response.js";
import type { McpNegotiatedSubscription } from "../src/mcp-subscription-filter-negotiator.js";
import type { McpToolsListResult } from "../src/mcp-tools-list-response.js";
import { McpPromptCache } from "../src/mcp-prompt-cache.js";
import { McpResourceListCache } from "../src/mcp-resource-list-cache.js";
import { McpResourceTemplatesListCache } from "../src/mcp-resource-templates-list-cache.js";
import { McpServerDiscoveryCache } from "../src/mcp-server-discovery-cache.js";
import { McpServerLocalStateCleanup } from "../src/mcp-server-local-state-cleanup.js";
import { McpSubscriptionState } from "../src/mcp-subscription-state.js";
import { McpToolCache } from "../src/mcp-tool-cache.js";

const tools: McpToolsListResult = {
  tools: [{ name: "read", description: "Read", inputSchema: { type: "object" } }],
  rejected_tool_names: [],
};
const prompts: McpPromptListResult = {
  prompts: [{ name: "summarize" }],
  rejected_prompt_names: [],
};
const resources: McpResourcesListResult = {
  resources: [{ uri: "https://example.test/docs/readme", name: "readme" }],
  rejected_resource_uris: [],
};
const templates: McpResourcesTemplatesListResult = {
  resource_templates: [{ uri_template: "https://example.test/docs/{name}", name: "document" }],
  rejected_template_names: [],
};
const discovery: McpServerDiscoverResult = {
  supported_versions: ["2025-06-18"],
  capabilities: {},
};
const subscription: McpNegotiatedSubscription = {
  subscription_id: "sub-1",
  notifications: { tools_list_changed: true },
};

describe("McpServerLocalStateCleanup", () => {
  it("clears every local MCP state boundary for one server and preserves another", () => {
    const toolsCache = new McpToolCache({ now: () => 1_000 });
    const promptCache = new McpPromptCache({ now: () => 1_000 });
    const resourceCache = new McpResourceListCache({ now: () => 1_000 });
    const templateCache = new McpResourceTemplatesListCache({ now: () => 1_000 });
    const discoveryCache = new McpServerDiscoveryCache({ now: () => 1_000 });
    const subscriptions = new McpSubscriptionState();
    const cleanup = new McpServerLocalStateCleanup({
      toolsCache,
      promptCache,
      resourceCache,
      templateCache,
      discoveryCache,
      subscriptions,
    });

    toolsCache.put("server-1", tools);
    toolsCache.put("server-2", tools);
    promptCache.put("server-1", prompts);
    promptCache.put("server-2", prompts);
    resourceCache.put("server-1", resources);
    resourceCache.put("server-2", resources);
    templateCache.put("server-1", templates);
    templateCache.put("server-2", templates);
    discoveryCache.put("server-1", discovery);
    discoveryCache.put("server-2", discovery);
    subscriptions.register("server-1", subscription);
    subscriptions.register("server-2", subscription);

    expect(cleanup.clear("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "cleared" },
    });
    expect(toolsCache.get("server-1")).toMatchObject({ ok: true, value: { status: "miss" } });
    expect(promptCache.get("server-1")).toMatchObject({ ok: true, value: { status: "miss" } });
    expect(resourceCache.get("server-1")).toMatchObject({ ok: true, value: { status: "miss" } });
    expect(templateCache.get("server-1")).toMatchObject({ ok: true, value: { status: "miss" } });
    expect(discoveryCache.get("server-1")).toMatchObject({ ok: true, value: { status: "miss" } });
    expect(subscriptions.get("server-1", "sub-1")).toMatchObject({
      ok: true,
      value: { status: "miss" },
    });
    expect(toolsCache.get("server-2")).toEqual({ ok: true, value: tools });
    expect(subscriptions.get("server-2", "sub-1")).toMatchObject({
      ok: true,
      value: { subscription_id: "sub-1" },
    });
  });

  it("fails closed for an invalid server ID without clearing valid state", () => {
    const toolsCache = new McpToolCache({ now: () => 1_000 });
    const cleanup = new McpServerLocalStateCleanup({ toolsCache });
    toolsCache.put("server-1", tools);

    expect(cleanup.clear("bad server")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(toolsCache.get("server-1")).toEqual({ ok: true, value: tools });
  });
});
