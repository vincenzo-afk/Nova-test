import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { HardwareProbe } from "./hardware-detection.js";

const execFileAsync = promisify(execFile);

export interface InstalledApplication {
  readonly name: string;
  readonly version?: string | undefined;
  readonly install_path?: string | undefined;
}

export interface RunningApplication {
  readonly name: string;
  readonly process_id: number;
  readonly started_at?: string | undefined;
}

export interface FilesystemScopeInventory {
  readonly path: string;
  readonly file_count: number;
  readonly folder_count: number;
}

export interface SystemInventory {
  readonly scanned_at: string;
  readonly hardware: HardwareProbe;
  readonly installed_applications: readonly InstalledApplication[];
  readonly running_applications: readonly RunningApplication[];
  readonly storage: {
    readonly model_storage_path: string;
    readonly available_disk_gb: number;
  };
  readonly granted_filesystem_scopes: readonly FilesystemScopeInventory[];
}

export interface SystemInventorySummary {
  readonly scanned_at: string;
  readonly hardware: HardwareProbe;
  readonly installed_application_count: number;
  readonly running_application_count: number;
  readonly available_disk_gb: number;
  readonly granted_filesystem_scope_count: number;
}

export const summarizeSystemInventory = (inventory: SystemInventory): SystemInventorySummary => ({
  scanned_at: inventory.scanned_at,
  hardware: inventory.hardware,
  installed_application_count: inventory.installed_applications.length,
  running_application_count: inventory.running_applications.length,
  available_disk_gb: inventory.storage.available_disk_gb,
  granted_filesystem_scope_count: inventory.granted_filesystem_scopes.length,
});

export interface SystemInventoryOptions {
  readonly modelStoragePath: string;
  readonly grantedFilesystemScopes: readonly string[];
  readonly runPowerShell?: (script: string) => Promise<string>;
  readonly platform?: NodeJS.Platform;
}

const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);

const inventorySchema = z.object({
  hardware: z.object({
    cpu_architecture: z.enum(["x86_64", "arm64", "unknown"]),
    cpu_cores: z.number().int().nonnegative(),
    avx2: z.union([z.boolean(), z.literal("unknown")]),
    avx512: z.union([z.boolean(), z.literal("unknown")]),
    gpu_vendor: z.enum(["nvidia", "amd", "apple", "intel"]).nullable(),
    gpu_vram_gb: z.number().nonnegative(),
    gpu_accelerator: z.enum(["cuda", "rocm", "metal", "opencl"]).nullable(),
    system_ram_gb: z.number().nonnegative(),
    available_disk_gb: z.number().nonnegative(),
    os: z.literal("windows"),
    battery_powered: z.boolean(),
  }),
  installed_applications: z.array(
    z.object({
      name: z.string().min(1),
      version: optionalString,
      install_path: optionalString,
    }),
  ),
  running_applications: z.array(
    z.object({
      name: z.string().min(1),
      process_id: z.number().int().nonnegative(),
      started_at: optionalString,
    }),
  ),
  storage: z.object({
    model_storage_path: z.string().min(1),
    available_disk_gb: z.number().nonnegative(),
  }),
  granted_filesystem_scopes: z.array(
    z.object({
      path: z.string().min(1),
      file_count: z.number().int().nonnegative(),
      folder_count: z.number().int().nonnegative(),
    }),
  ),
});

export class WindowsSystemInventory {
  private readonly runPowerShell: (script: string) => Promise<string>;
  private readonly platform: NodeJS.Platform;

  public constructor(private readonly options: SystemInventoryOptions) {
    this.platform = options.platform ?? process.platform;
    this.runPowerShell =
      options.runPowerShell ??
      (async (script) => {
        if (this.platform !== "win32") {
          throw new Error("Windows inventory is only available on Windows.");
        }
        const result = await execFileAsync(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
          { maxBuffer: 32 * 1024 * 1024, windowsHide: true },
        );
        return result.stdout;
      });
  }

  public async collect(): Promise<SystemInventory> {
    const output = await this.runPowerShell(this.script());
    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error("Windows inventory output failed validation: invalid JSON.");
    }
    const result = inventorySchema.safeParse(parsed);
    if (!result.success) {
      throw new Error("Windows inventory output failed validation.");
    }
    return {
      scanned_at: new Date().toISOString(),
      ...result.data,
    };
  }

  private script(): string {
    const modelStoragePath = powershellString(this.options.modelStoragePath);
    const scopes = this.options.grantedFilesystemScopes.map(powershellString);
    const scopeArray = scopes.length > 0 ? `@(${scopes.join(",")})` : "@()";
    return `
$ErrorActionPreference = 'Stop'
$modelStoragePath = ${modelStoragePath}
$grantedScopes = ${scopeArray}
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$computer = Get-CimInstance Win32_ComputerSystem | Select-Object -First 1
$os = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1
$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name } | Select-Object -First 1
$drive = Split-Path -Qualifier $modelStoragePath
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive'" | Select-Object -First 1
$gpuName = if ($gpu) { [string]$gpu.Name } else { '' }
$gpuVendor = if ($gpuName -match 'NVIDIA') { 'nvidia' } elseif ($gpuName -match 'AMD|Advanced Micro') { 'amd' } elseif ($gpuName -match 'Intel') { 'intel' } else { $null }
$gpuAccelerator = if ($gpuVendor -eq 'nvidia' -and (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) { 'cuda' } elseif ($gpuVendor -eq 'amd' -and (Get-Command rocminfo -ErrorAction SilentlyContinue)) { 'rocm' } elseif (Get-Command clinfo -ErrorAction SilentlyContinue) { 'opencl' } else { $null }
$arch = if ($os.OSArchitecture -match 'ARM') { 'arm64' } elseif ($os.OSArchitecture -match '64') { 'x86_64' } elseif ($env:PROCESSOR_ARCHITEW6432 -match 'AMD64|x86_64') { 'x86_64' } elseif ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } elseif ($env:PROCESSOR_ARCHITECTURE -match 'AMD64|x86_64') { 'x86_64' } else { 'unknown' }
$installed = @(
  @(
    Get-ItemProperty 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue
    Get-ItemProperty 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue
    Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue
  ) | Where-Object { $_.DisplayName } | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.DisplayName; version = if ($_.DisplayVersion) { [string]$_.DisplayVersion } else { $null }; install_path = if ($_.InstallLocation) { [string]$_.InstallLocation } else { $null } }
  }
  Get-AppxPackage -ErrorAction SilentlyContinue | Where-Object { $_.Name } | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.Name; version = if ($_.Version) { [string]$_.Version } else { $null }; install_path = if ($_.InstallLocation) { [string]$_.InstallLocation } else { $null } }
  }
) | Sort-Object name -Unique
$running = @(
  Get-Process | ForEach-Object {
    $started = $null
    try { $started = $_.StartTime.ToUniversalTime().ToString('o') } catch { }
    [pscustomobject]@{ name = [string]$_.ProcessName; process_id = [int]$_.Id; started_at = $started }
  }
)
$filesystem = @(
  foreach ($scope in $grantedScopes) {
    $files = @(Get-ChildItem -LiteralPath $scope -File -Recurse -Force -ErrorAction SilentlyContinue)
    $folders = @(Get-ChildItem -LiteralPath $scope -Directory -Recurse -Force -ErrorAction SilentlyContinue)
    [pscustomobject]@{ path = [string]$scope; file_count = $files.Count; folder_count = $folders.Count }
  }
)
[pscustomobject]@{
  hardware = [pscustomobject]@{
    cpu_architecture = $arch
    cpu_cores = if ($cpu.NumberOfCores) { [int]$cpu.NumberOfCores } else { [int]$env:NUMBER_OF_PROCESSORS }
    avx2 = 'unknown'
    avx512 = 'unknown'
    gpu_vendor = $gpuVendor
    gpu_vram_gb = if ($gpu.AdapterRAM) { [math]::Round(([double]$gpu.AdapterRAM / 1GB), 2) } else { 0 }
    gpu_accelerator = $gpuAccelerator
    system_ram_gb = [math]::Round(([double]$computer.TotalPhysicalMemory / 1GB), 2)
    available_disk_gb = if ($disk.FreeSpace) { [math]::Round(([double]$disk.FreeSpace / 1GB), 2) } else { 0 }
    os = 'windows'
    battery_powered = [bool](@(Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue).Count)
  }
  installed_applications = $installed
  running_applications = $running
  storage = [pscustomobject]@{ model_storage_path = [string]$modelStoragePath; available_disk_gb = if ($disk.FreeSpace) { [math]::Round(([double]$disk.FreeSpace / 1GB), 2) } else { 0 } }
  granted_filesystem_scopes = $filesystem
} | ConvertTo-Json -Depth 8 -Compress
`;
  }
}

const powershellString = (value: string): string => `'${value.replaceAll("'", "''")}'`;
