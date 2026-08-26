import { describe, expect, it, vi } from "vitest";
import { McpToolDiscovery } from "../src/mcp-tool-discovery.js";
import { ToolRegistry } from "../src/tool-registry.js";

describe("McpToolDiscovery", () => {
  it("namespaces a discovered tool and applies conservative metadata defaults", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);

    const result = discovery.register("weather-server", [
      {
        name: "get_forecast",
        description: "Read a weather forecast.",
        inputSchema: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        outputSchema: {
          type: "object",
          properties: { temperature: { type: "number" } },
        },
      },
    ]);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("expected discovery registration to succeed");
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({
      tool_id: "weather-server.get_forecast",
      execution_tier: "mcp",
      deterministic: true,
      dependencies: [],
      target_entity_types: [],
      supported_actions: [
        {
          action_id: "invoke",
          risk_tier: "destructive_irreversible",
          verification_signal: "none",
          lockable_resources: [],
          permission_scope: "mcp:weather-server",
          estimated_latency_ms: 1_000,
          estimated_cost_class: "low",
          timeout_ms: 30_000,
          idempotent: false,
          input_schema: {
            type: "object",
            properties: { city: { type: "string" } },
            required: ["city"],
          },
          output_schema: {
            type: "object",
            properties: { temperature: { type: "number" } },
          },
        },
      ],
    });
    expect(registry.get("weather-server.get_forecast")).toMatchObject({ ok: true });
  });

  it("deep-clones nested schemas before exposing registered tools", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);
    const inputSchema = {
      type: "object",
      properties: { city: { type: "string" } },
    };
    const outputSchema = {
      type: "object",
      properties: { temperature: { type: "number" } },
    };

    expect(
      discovery.register("weather-server", [{ name: "get_forecast", inputSchema, outputSchema }]),
    ).toMatchObject({ ok: true });
    inputSchema.properties.city.type = "number";
    outputSchema.properties.temperature.type = "string";

    const registered = registry.get("weather-server.get_forecast");
    expect(registered).toMatchObject({
      ok: true,
      value: {
        supported_actions: [
          {
            input_schema: { properties: { city: { type: "string" } } },
            output_schema: { properties: { temperature: { type: "number" } } },
          },
        ],
      },
    });
  });

  it("rejects oversized schemas before registry exposure", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);
    const oversizedSchema = { type: "object", description: "x".repeat(131_072) };

    expect(
      discovery.register("large-schema", [{ name: "inspect", inputSchema: oversizedSchema }]),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(registry.get("large-schema.inspect")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("rejects malformed advertisements atomically before registry exposure", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);

    const result = discovery.register("weather-server", [
      { name: "valid", inputSchema: { type: "object" } },
      { name: "", inputSchema: { type: "object" } },
    ]);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(registry.get("weather-server.valid")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("rejects an oversized permission scope before registry exposure", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);

    const result = discovery.register("weather-server", [
      {
        name: "inspect",
        inputSchema: { type: "object" },
        nova: { permission_scope: "x".repeat(257) },
      },
    ]);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(registry.get("weather-server.inspect")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("rejects an oversized lockable-resource list before registry exposure", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);

    const result = discovery.register("weather-server", [
      {
        name: "inspect",
        inputSchema: { type: "object" },
        nova: { lockable_resources: Array.from({ length: 65 }, (_, index) => `resource_${index}`) },
      },
    ]);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(registry.get("weather-server.inspect")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("rejects invalid execution metadata atomically before registry exposure", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);

    const result = discovery.register("weather-server", [
      { name: "valid", inputSchema: { type: "object" } },
      {
        name: "invalid",
        inputSchema: { type: "object" },
        nova: { timeout_ms: 0 },
      },
    ]);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(registry.get("weather-server.valid")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("rolls back earlier registrations when an initial batch fails", () => {
    const backingRegistry = new ToolRegistry();
    const failure = {
      ok: false as const,
      error: { code: "NOVA-TL002", message: "registration failed", retryable: false },
    };
    const failingRegistry = {
      get: backingRegistry.get.bind(backingRegistry),
      query: backingRegistry.query.bind(backingRegistry),
      register: vi.fn((tool: Parameters<ToolRegistry["register"]>[0]) =>
        tool.tool_id === "first.new_lookup" ? failure : backingRegistry.register(tool),
      ),
      deregister: backingRegistry.deregister.bind(backingRegistry),
    } as unknown as ToolRegistry;
    const discovery = new McpToolDiscovery(failingRegistry);

    expect(
      discovery.register("first", [
        { name: "old_lookup", inputSchema: { type: "object" } },
        { name: "new_lookup", inputSchema: { type: "object" } },
      ]),
    ).toEqual(failure);
    expect(backingRegistry.get("first.old_lookup")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
    expect(backingRegistry.get("first.new_lookup")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("replaces one server's registered tools without affecting another server", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);

    expect(
      discovery.register("first", [{ name: "old_lookup", inputSchema: { type: "object" } }]),
    ).toMatchObject({ ok: true });
    expect(
      discovery.register("second", [{ name: "lookup", inputSchema: { type: "object" } }]),
    ).toMatchObject({ ok: true });

    expect(
      discovery.replace("first", [{ name: "new_lookup", inputSchema: { type: "object" } }]),
    ).toMatchObject({ ok: true });
    expect(registry.get("first.old_lookup")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
    expect(registry.get("first.new_lookup")).toMatchObject({ ok: true });
    expect(registry.get("second.lookup")).toMatchObject({ ok: true });
  });

  it("preserves the current source when replacement validation or collision checks fail", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);

    expect(
      discovery.register("first", [{ name: "old_lookup", inputSchema: { type: "object" } }]),
    ).toMatchObject({ ok: true });
    expect(
      discovery.register("second", [{ name: "lookup", inputSchema: { type: "object" } }]),
    ).toMatchObject({ ok: true });

    expect(
      discovery.replace("first", [{ name: "", inputSchema: { type: "object" } }]),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(registry.get("first.old_lookup")).toMatchObject({ ok: true });

    expect(
      discovery.replace("first", [
        { name: "new_lookup", inputSchema: { type: "object" } },
        { name: "new_lookup", inputSchema: { type: "object" } },
      ]),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(registry.get("first.old_lookup")).toMatchObject({ ok: true });
  });

  it("restores the previous source when registry registration fails during replacement", () => {
    const backingRegistry = new ToolRegistry();
    const initialDiscovery = new McpToolDiscovery(backingRegistry);
    expect(
      initialDiscovery.register("first", [{ name: "old_lookup", inputSchema: { type: "object" } }]),
    ).toMatchObject({ ok: true });
    const failure = {
      ok: false as const,
      error: { code: "NOVA-TL002", message: "registration failed", retryable: false },
    };
    const failingRegistry = {
      get: backingRegistry.get.bind(backingRegistry),
      query: backingRegistry.query.bind(backingRegistry),
      register: vi.fn((tool: Parameters<ToolRegistry["register"]>[0]) =>
        tool.tool_id === "first.new_lookup" ? failure : backingRegistry.register(tool),
      ),
      deregister: backingRegistry.deregister.bind(backingRegistry),
    } as unknown as ToolRegistry;
    const discovery = new McpToolDiscovery(failingRegistry);

    expect(
      discovery.replace("first", [{ name: "new_lookup", inputSchema: { type: "object" } }]),
    ).toEqual(failure);
    expect(backingRegistry.get("first.old_lookup")).toMatchObject({ ok: true });
    expect(backingRegistry.get("first.new_lookup")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("restores the source when registry deregistration fails partway through", () => {
    const backingRegistry = new ToolRegistry();
    const initialDiscovery = new McpToolDiscovery(backingRegistry);
    expect(
      initialDiscovery.register("first", [
        { name: "old_lookup", inputSchema: { type: "object" } },
        { name: "new_lookup", inputSchema: { type: "object" } },
      ]),
    ).toMatchObject({ ok: true });
    const failure = {
      ok: false as const,
      error: { code: "NOVA-TL002", message: "deregistration failed", retryable: false },
    };
    const failingRegistry = {
      get: backingRegistry.get.bind(backingRegistry),
      query: backingRegistry.query.bind(backingRegistry),
      register: backingRegistry.register.bind(backingRegistry),
      deregister: vi.fn((toolId: string) =>
        toolId === "first.new_lookup" ? failure : backingRegistry.deregister(toolId),
      ),
    } as unknown as ToolRegistry;
    const discovery = new McpToolDiscovery(failingRegistry);

    expect(discovery.deregister("first")).toEqual(failure);
    expect(backingRegistry.get("first.old_lookup")).toMatchObject({ ok: true });
    expect(backingRegistry.get("first.new_lookup")).toMatchObject({ ok: true });
  });

  it("deregisters all tools owned by a server without affecting another server", () => {
    const registry = new ToolRegistry();
    const discovery = new McpToolDiscovery(registry);
    const descriptor = { name: "lookup", inputSchema: { type: "object" } };

    expect(discovery.register("first", [descriptor])).toMatchObject({ ok: true });
    expect(discovery.register("second", [descriptor])).toMatchObject({ ok: true });

    expect(discovery.deregister("first")).toMatchObject({ ok: true });
    expect(registry.get("first.lookup")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
    expect(registry.get("second.lookup")).toMatchObject({ ok: true });
  });
});
