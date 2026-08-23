export type HardwareTier = "Minimal" | "Standard" | "High";
export type OperatingSystem = "windows" | "macos" | "linux" | "android" | "unknown";

export interface HardwareProbe {
  readonly cpu_architecture: "x86_64" | "arm64" | "unknown";
  readonly cpu_cores: number;
  readonly avx2: boolean | "unknown";
  readonly avx512: boolean | "unknown";
  readonly gpu_vendor: "nvidia" | "amd" | "apple" | "intel" | null;
  readonly gpu_vram_gb: number;
  readonly gpu_accelerator: "cuda" | "rocm" | "metal" | "opencl" | null;
  readonly system_ram_gb: number;
  readonly available_disk_gb: number;
  readonly os: OperatingSystem;
  readonly battery_powered: boolean;
}

export interface HardwareProfile {
  readonly scanned_at: string;
  readonly signals: HardwareProbe;
  readonly overall_tier: HardwareTier;
  readonly recommendations: {
    readonly llm: "cloud" | "local-or-cloud" | "local-first";
    readonly vision: "cloud" | "local-or-cloud" | "local-first";
    readonly speech: "local-or-cloud" | "local-first";
  };
}

export class HardwareDetector {
  private profile: HardwareProfile | undefined;

  public constructor(private readonly probe: () => Promise<HardwareProbe>) {}

  public async scan(): Promise<HardwareProfile> {
    const signals = await this.probe();
    const profile = this.classify(signals);
    this.profile = profile;
    return profile;
  }

  public async rescan(): Promise<HardwareProfile> {
    return this.scan();
  }

  public lastProfile(): HardwareProfile | undefined {
    return this.profile;
  }

  private classify(signals: HardwareProbe): HardwareProfile {
    const high =
      signals.gpu_vram_gb >= 24 ||
      (signals.cpu_architecture === "arm64" && signals.system_ram_gb >= 32);
    const standard = high || signals.gpu_vram_gb >= 8 || signals.system_ram_gb >= 16;
    const overall_tier: HardwareTier = high ? "High" : standard ? "Standard" : "Minimal";
    return {
      scanned_at: new Date().toISOString(),
      signals,
      overall_tier,
      recommendations: {
        llm:
          overall_tier === "High"
            ? "local-first"
            : overall_tier === "Standard"
              ? "local-or-cloud"
              : "cloud",
        vision:
          overall_tier === "High"
            ? "local-first"
            : overall_tier === "Standard"
              ? "local-or-cloud"
              : "cloud",
        speech: overall_tier === "High" ? "local-first" : "local-or-cloud",
      },
    };
  }
}
