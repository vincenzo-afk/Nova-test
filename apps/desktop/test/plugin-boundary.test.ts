import { describe, expect, it } from "vitest";
import type { PluginRecord } from "@nova/runtime";
import { projectPluginRecord } from "../src/main/response-projections.js";

describe("plugin renderer boundary", () => {
  it("projects records without manifests, entry points, or permission names", () => {
    const record: PluginRecord = {
      manifest: {
        plugin_id: "demo.plugin",
        version: "1.2.3",
        nova_api_version_range: "^1.0.0",
        display_name: "Demo Plugin",
        description: "Sensitive internal description",
        provided_tools: ["demo.read", "demo.write"],
        required_permissions: ["filesystem.private", "network.private"],
        optional_permissions: ["notifications"],
        dependencies: [{ plugin_id: "dependency", version_range: "^1.0.0" }],
        entry_point: "/private/plugins/demo/index.js",
      },
      state: "Enabled",
      granted_permissions: ["filesystem.private"],
    };

    const projected = projectPluginRecord(record);

    expect(projected).toEqual({
      plugin_id: "demo.plugin",
      version: "1.2.3",
      state: "Enabled",
      provided_tool_count: 2,
      required_permission_count: 2,
    });
    expect(JSON.stringify(projected)).not.toContain("Sensitive internal description");
    expect(JSON.stringify(projected)).not.toContain("index.js");
    expect(JSON.stringify(projected)).not.toContain("filesystem.private");
  });
});
