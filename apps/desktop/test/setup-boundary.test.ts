import { describe, expect, it } from "vitest";
import type { SetupState } from "@nova/runtime";
import { projectSetupState } from "../src/main/response-projections.js";

describe("setup renderer boundary", () => {
  it("projects only setup progress metadata", () => {
    const state: SetupState = {
      current_step: "summary",
      completed_steps: ["core-llm"],
      deferred_steps: ["voice"],
      hardware: {
        cpu_architecture: "x86_64",
        cpu_cores: 8,
        avx2: true,
        avx512: false,
        gpu_vendor: null,
        gpu_vram_gb: 0,
        gpu_accelerator: null,
        system_ram_gb: 16,
        available_disk_gb: 80,
        os: "windows",
        battery_powered: false,
      },
      inventory: {
        scanned_at: "2026-08-26T00:00:00.000Z",
        hardware: {} as SetupState["hardware"],
        installed_applications: [{ name: "Secret App", install_path: "C:/private" }],
        running_applications: [],
        storage: { model_storage_path: "C:/models", available_disk_gb: 80 },
        granted_filesystem_scopes: [{ path: "C:/private", file_count: 1, folder_count: 1 }],
      },
      configuration: {
        schema_version: "1.0.0",
        capabilities: {},
        devices: [],
        channels: [],
        plugins: [],
        mcp_servers: [],
        routing_policies: { secret: "private" },
        permissions: {},
        voice: {
          enabled: false,
          wake_word: "nova",
          always_listening: false,
          barge_in_sensitivity: "conservative",
        },
        personalization: {
          preferences: [
            {
              id: "secret",
              category: "tone",
              value: "private",
              enabled: true,
              source: "user",
              updated_at: "now",
            },
          ],
        },
      },
    };

    const projected = projectSetupState(state);

    expect(projected).toEqual({
      current_step: "summary",
      completed_steps: ["core-llm"],
      deferred_steps: ["voice"],
    });
    expect(JSON.stringify(projected)).not.toContain("C:/private");
    expect(JSON.stringify(projected)).not.toContain("C:/models");
    expect(JSON.stringify(projected)).not.toContain("Secret App");
    expect(JSON.stringify(projected)).not.toContain("private");
  });
});
