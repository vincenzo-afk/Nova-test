import { describe, expect, it } from "vitest";
import type { PluginDiscoveryProposal, PluginDiscoveryResult } from "@nova/runtime";
import {
  projectPluginDiscoveryProposals,
  projectPluginDiscoveryResult,
} from "../src/main/response-projections.js";

const proposal: PluginDiscoveryProposal = {
  plugin_id: "demo.plugin",
  latest_version: "1.2.3",
  publisher: "Demo Publisher",
  source_url: "https://registry.example.invalid/demo.plugin.tgz",
  signature_key: "secret-trust-material",
  capabilities: ["vision", "ocr"],
  required_permissions: ["filesystem.private", "network.private"],
  status: "pending",
};

describe("plugin discovery renderer boundary", () => {
  it("projects discovery results without supply-chain URLs, keys, or raw scopes", () => {
    const result: PluginDiscoveryResult = {
      capability_id: "vision",
      domain: "perception",
      proposals: [proposal],
      fallback: null,
    };

    const projected = projectPluginDiscoveryResult(result);

    expect(projected).toEqual({
      capability_id: "vision",
      domain: "perception",
      proposals: [
        {
          plugin_id: "demo.plugin",
          latest_version: "1.2.3",
          publisher: "Demo Publisher",
          capability_count: 2,
          required_permission_count: 2,
          status: "pending",
        },
      ],
      fallback: null,
    });
    expect(JSON.stringify(projected)).not.toContain("registry.example.invalid");
    expect(JSON.stringify(projected)).not.toContain("secret-trust-material");
    expect(JSON.stringify(projected)).not.toContain("filesystem.private");
  });

  it("projects pending proposals with the same bounded shape", () => {
    expect(projectPluginDiscoveryProposals([proposal])).toEqual([
      {
        plugin_id: "demo.plugin",
        latest_version: "1.2.3",
        publisher: "Demo Publisher",
        capability_count: 2,
        required_permission_count: 2,
        status: "pending",
      },
    ]);
  });
});
