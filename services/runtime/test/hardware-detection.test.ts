import { describe, expect, it, vi } from "vitest";
import { HardwareDetector, type HardwareProbe } from "../src/hardware-detection.js";

const probe = (overrides: Partial<HardwareProbe> = {}): HardwareProbe => ({
  cpu_architecture: "x86_64",
  cpu_cores: 8,
  avx2: true,
  avx512: false,
  gpu_vendor: null,
  gpu_vram_gb: 0,
  gpu_accelerator: null,
  system_ram_gb: 8,
  available_disk_gb: 100,
  os: "linux",
  battery_powered: false,
  ...overrides,
});

describe("HardwareDetector", () => {
  it("classifies minimal hardware conservatively while keeping local speech viable", async () => {
    const detector = new HardwareDetector(async () => probe());

    const profile = await detector.scan();

    expect(profile).toMatchObject({
      overall_tier: "Minimal",
      recommendations: { llm: "cloud", vision: "cloud", speech: "local-or-cloud" },
    });
  });

  it("classifies standard and high tiers from GPU or unified memory signals", async () => {
    const standard = await new HardwareDetector(async () =>
      probe({ gpu_vendor: "nvidia", gpu_vram_gb: 12, gpu_accelerator: "cuda", system_ram_gb: 32 }),
    ).scan();
    expect(standard.overall_tier).toBe("Standard");

    const high = await new HardwareDetector(async () =>
      probe({ cpu_architecture: "arm64", gpu_vendor: "apple", gpu_vram_gb: 0, system_ram_gb: 32 }),
    ).scan();
    expect(high.overall_tier).toBe("High");
  });

  it("re-scans on demand and does not mutate provider configuration", async () => {
    const probeFn = vi
      .fn()
      .mockResolvedValueOnce(probe())
      .mockResolvedValueOnce(probe({ system_ram_gb: 32, gpu_vendor: "nvidia", gpu_vram_gb: 24 }));
    const detector = new HardwareDetector(probeFn);

    await detector.scan();
    const rescanned = await detector.rescan();

    expect(probeFn).toHaveBeenCalledTimes(2);
    expect(rescanned.overall_tier).toBe("High");
    expect(detector.lastProfile()).toEqual(rescanned);
  });
});
