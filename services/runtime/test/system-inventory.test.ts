import { describe, expect, it, vi } from "vitest";
import { WindowsSystemInventory } from "../src/system-inventory.js";

describe("WindowsSystemInventory", () => {
  it("collects documented machine and application inventory from one structured host probe", async () => {
    const runPowerShell = vi.fn(async (script: string) => {
      expect(script).toContain("Get-AppxPackage");
      expect(script).toContain("PROCESSOR_ARCHITEW6432");
      expect(script).toContain("OSArchitecture");
      return JSON.stringify({
        hardware: {
          cpu_architecture: "x86_64",
          cpu_cores: 16,
          avx2: true,
          avx512: false,
          gpu_vendor: "nvidia",
          gpu_vram_gb: 12,
          gpu_accelerator: "cuda",
          system_ram_gb: 32,
          available_disk_gb: 512,
          os: "windows",
          battery_powered: false,
        },
        installed_applications: [
          { name: "Google Chrome", version: "1.0", install_path: "C:\\Apps\\Chrome" },
        ],
        running_applications: [
          { name: "chrome", process_id: 1234, started_at: "2026-08-23T00:00:00.000Z" },
        ],
        storage: {
          model_storage_path: "C:\\Users\\S K\\AppData\\Local\\Nova\\models",
          available_disk_gb: 512,
        },
        granted_filesystem_scopes: [
          { path: "C:\\Users\\S K\\Documents", file_count: 4, folder_count: 2 },
        ],
      });
    });
    const inventory = new WindowsSystemInventory({
      runPowerShell,
      modelStoragePath: "C:\\Users\\S K\\AppData\\Local\\Nova\\models",
      grantedFilesystemScopes: ["C:\\Users\\S K\\Documents"],
    });

    const result = await inventory.collect();

    expect(result).toMatchObject({
      hardware: { os: "windows", cpu_cores: 16, gpu_vram_gb: 12 },
      installed_applications: [{ name: "Google Chrome" }],
      running_applications: [{ name: "chrome", process_id: 1234 }],
      granted_filesystem_scopes: [{ path: "C:\\Users\\S K\\Documents", file_count: 4 }],
    });
    expect(runPowerShell).toHaveBeenCalledOnce();
    expect(runPowerShell.mock.calls[0]?.[0]).toContain("Get-CimInstance");
  });

  it("rejects malformed host output instead of returning fabricated inventory", async () => {
    const inventory = new WindowsSystemInventory({
      runPowerShell: async () => JSON.stringify({ hardware: { os: "windows" } }),
      modelStoragePath: "C:\\Nova\\models",
      grantedFilesystemScopes: [],
    });

    await expect(inventory.collect()).rejects.toThrow("Windows inventory output failed validation");
  });
});
