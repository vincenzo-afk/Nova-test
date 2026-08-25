import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../src/tool-registry.js";
import type { RegisteredTool } from "../src/tool-registry.js";

const fileTool: RegisteredTool = {
  tool_id: "builtin.filesystem",
  execution_tier: "native_runtime",
  deterministic: true,
  dependencies: [],
  target_entity_types: ["file"],
  supported_actions: [
    {
      action_id: "read",
      risk_tier: "read_only",
      verification_signal: "file_hash",
      lockable_resources: ["file"],
      permission_scope: "filesystem.read",
      estimated_latency_ms: 10,
      estimated_cost_class: "free",
      timeout_ms: 5_000,
      idempotent: true,
      input_schema: { type: "object" },
      output_schema: { type: "string" },
    },
  ],
};

describe("ToolRegistry", () => {
  it("rejects registration when required verification or idempotency metadata is missing", () => {
    const registry = new ToolRegistry();
    const invalid = {
      ...fileTool,
      supported_actions: [
        { ...fileTool.supported_actions[0], verification_signal: undefined, idempotent: undefined },
      ],
    } as unknown as RegisteredTool;

    const result = registry.register(invalid);

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });

  it("rejects a duplicate tool identifier instead of overwriting the first registration", () => {
    const registry = new ToolRegistry();

    expect(registry.register(fileTool)).toMatchObject({ ok: true });
    const duplicate = registry.register({ ...fileTool, deterministic: false });

    expect(duplicate).toMatchObject({ ok: false, error: { code: "NOVA-TL004" } });
    expect(registry.get(fileTool.tool_id)).toMatchObject({
      ok: true,
      value: { deterministic: true },
    });
  });

  it("returns tools filtered by capability target and execution tier", () => {
    const registry = new ToolRegistry();
    registry.register(fileTool);
    registry.register({
      ...fileTool,
      tool_id: "builtin.browser",
      target_entity_types: ["browser_tab"],
      execution_tier: "api",
    });

    const result = registry.query({ target_entity_type: "file", execution_tier: "native_runtime" });

    expect(result).toMatchObject({ ok: true, value: [fileTool] });
  });

  it("lists bounded tool summaries without schemas or execution details", () => {
    const registry = new ToolRegistry();
    registry.register(fileTool);
    registry.register({
      ...fileTool,
      tool_id: "builtin.browser",
      target_entity_types: ["browser_tab"],
      execution_tier: "api",
    });

    expect(registry.listSummaries()).toEqual([
      {
        tool_id: "builtin.browser",
        execution_tier: "api",
        deterministic: true,
        action_count: 1,
        read_only_action_count: 1,
      },
      {
        tool_id: "builtin.filesystem",
        execution_tier: "native_runtime",
        deterministic: true,
        action_count: 1,
        read_only_action_count: 1,
      },
    ]);
  });

  it("deregisters a tool and makes it unavailable to future lookups", () => {
    const registry = new ToolRegistry();
    registry.register(fileTool);

    expect(registry.deregister(fileTool.tool_id)).toMatchObject({ ok: true });
    expect(registry.get(fileTool.tool_id)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });
});
