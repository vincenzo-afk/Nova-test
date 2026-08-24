import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";
import type { HardwareProfile, HardwareTier } from "./hardware-detection.js";
import type { CapabilityDomain } from "./provider-registry.js";

export interface LocalModelCatalogEntry {
  readonly model_id: string;
  readonly provider_id: string;
  readonly domain: CapabilityDomain;
  readonly download_url: string;
  readonly sha256: string;
  readonly size_bytes: number;
  readonly minimum_hardware_tier: HardwareTier;
  readonly adapter_id: string;
}

export type LocalModelAvailability = "recommended" | "available-but-unrecommended";
export type LocalModelStatus = "not-downloaded" | "downloaded" | "loaded" | "reclaimable";

export interface LocalModelDiscovery {
  readonly model_id: string;
  readonly provider_id: string;
  readonly domain: CapabilityDomain;
  readonly adapter_id: string;
  readonly minimum_hardware_tier: HardwareTier;
  readonly availability: LocalModelAvailability;
  readonly reason: "hardware_meets_minimum_tier" | "hardware_below_minimum_tier";
  readonly status: LocalModelStatus;
}

export interface LocalModelDownloadResult {
  readonly model_id: string;
  readonly provider_id: string;
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly status: "downloaded" | "already-present";
}

export interface LocalModelLoadResult {
  readonly model_id: string;
  readonly provider_id: string;
  readonly path: string;
  readonly adapter: unknown;
}

export interface LocalModelRetirementResult {
  readonly model_id: string;
  readonly status: "reclaimable";
}

export interface LocalModelManagerOptions {
  readonly storagePath: string;
  readonly catalog: readonly LocalModelCatalogEntry[];
  readonly fetchModel: (url: string) => Promise<Uint8Array>;
  readonly loadAdapter: (entry: LocalModelCatalogEntry, path: string) => Promise<unknown>;
  readonly logger?: StructuredLogger;
}

export class LocalModelManager {
  private readonly entries: ReadonlyMap<string, LocalModelCatalogEntry>;
  private readonly statuses = new Map<string, LocalModelStatus>();
  private readonly downloadOperations = new Map<
    string,
    Promise<Result<LocalModelDownloadResult>>
  >();
  private readonly loaded = new Map<string, LocalModelLoadResult>();

  public constructor(private readonly options: LocalModelManagerOptions) {
    this.entries = new Map(options.catalog.map((entry) => [entry.model_id, entry]));
  }

  public discover(hardware: HardwareProfile): readonly LocalModelDiscovery[] {
    return [...this.entries.values()].map((entry) => {
      const meetsMinimum = tierRank(hardware.overall_tier) >= tierRank(entry.minimum_hardware_tier);
      return {
        model_id: entry.model_id,
        provider_id: entry.provider_id,
        domain: entry.domain,
        adapter_id: entry.adapter_id,
        minimum_hardware_tier: entry.minimum_hardware_tier,
        availability: meetsMinimum ? "recommended" : "available-but-unrecommended",
        reason: meetsMinimum ? "hardware_meets_minimum_tier" : "hardware_below_minimum_tier",
        status: this.statuses.get(entry.model_id) ?? "not-downloaded",
      } satisfies LocalModelDiscovery;
    });
  }

  public async download(modelId: string): Promise<Result<LocalModelDownloadResult>> {
    const active = this.downloadOperations.get(modelId);
    if (active) return active;
    const operation = this.downloadInternal(modelId);
    this.downloadOperations.set(modelId, operation);
    try {
      return await operation;
    } finally {
      this.downloadOperations.delete(modelId);
    }
  }

  public async load(modelId: string): Promise<Result<LocalModelLoadResult>> {
    const entry = this.entries.get(modelId);
    if (!entry) return err(this.failure("Local model is not in the catalog."));
    const path = this.modelPath(entry);
    const verification = await this.verifyStoredModel(entry, path);
    if (!verification.ok) return verification;

    try {
      const adapter = await this.options.loadAdapter(entry, path);
      const loaded: LocalModelLoadResult = {
        model_id: entry.model_id,
        provider_id: entry.provider_id,
        path,
        adapter,
      };
      this.loaded.set(modelId, loaded);
      this.statuses.set(modelId, "loaded");
      this.options.logger?.info("model.loaded", {
        model_id: entry.model_id,
        provider_id: entry.provider_id,
        adapter_id: entry.adapter_id,
      });
      return ok(loaded);
    } catch {
      return err(this.failure("Local model adapter could not load the verified model."));
    }
  }

  public markRetired(modelId: string): Result<LocalModelRetirementResult> {
    const entry = this.entries.get(modelId);
    if (!entry) return err(this.failure("Local model is not in the catalog."));
    if (!this.statuses.has(modelId) || this.statuses.get(modelId) === "not-downloaded")
      return err(this.failure("Only a downloaded local model can be marked reclaimable."));

    this.statuses.set(modelId, "reclaimable");
    this.loaded.delete(modelId);
    this.options.logger?.info("model.retirement.marked", {
      model_id: entry.model_id,
      provider_id: entry.provider_id,
    });
    return ok({ model_id: modelId, status: "reclaimable" });
  }

  public reclaimable(): readonly LocalModelCatalogEntry[] {
    return [...this.entries.values()].filter(
      (entry) => this.statuses.get(entry.model_id) === "reclaimable",
    );
  }

  private async downloadInternal(modelId: string): Promise<Result<LocalModelDownloadResult>> {
    const entry = this.entries.get(modelId);
    if (!entry) return err(this.failure("Local model is not in the catalog."));
    if (!isHttpsUrl(entry.download_url))
      return err(this.failure("Local model download URLs must use HTTPS."));
    if (
      !isValidSha256(entry.sha256) ||
      !Number.isSafeInteger(entry.size_bytes) ||
      entry.size_bytes < 0
    )
      return err(this.failure("Local model catalog integrity metadata is invalid."));

    const path = this.modelPath(entry);
    const existing = await this.verifyStoredModel(entry, path);
    if (existing.ok) {
      this.statuses.set(modelId, "downloaded");
      return ok({
        model_id: entry.model_id,
        provider_id: entry.provider_id,
        path,
        sha256: entry.sha256,
        bytes: entry.size_bytes,
        status: "already-present",
      });
    }

    try {
      const bytes = await this.options.fetchModel(entry.download_url);
      if (bytes.byteLength !== entry.size_bytes)
        return err(this.failure("Downloaded local model size does not match its catalog entry."));
      const digest = sha256(bytes);
      if (digest !== entry.sha256.toLowerCase())
        return err(
          this.failure("Downloaded local model checksum does not match its catalog entry."),
        );

      await mkdir(this.options.storagePath, { recursive: true });
      const temporaryPath = join(
        this.options.storagePath,
        `.${basename(path)}.download-${process.pid}-${Date.now()}`,
      );
      try {
        await writeFile(temporaryPath, bytes, { flag: "wx" });
        await rename(temporaryPath, path);
      } finally {
        await rm(temporaryPath, { force: true });
      }
      this.statuses.set(modelId, "downloaded");
      this.options.logger?.info("model.download.completed", {
        model_id: entry.model_id,
        provider_id: entry.provider_id,
        bytes: bytes.byteLength,
        status: "downloaded",
      });
      return ok({
        model_id: entry.model_id,
        provider_id: entry.provider_id,
        path,
        sha256: digest,
        bytes: bytes.byteLength,
        status: "downloaded",
      });
    } catch {
      return err(this.failure("Local model download failed before a verified file was stored."));
    }
  }

  private async verifyStoredModel(
    entry: LocalModelCatalogEntry,
    path: string,
  ): Promise<Result<{ readonly bytes: number }>> {
    try {
      const metadata = await stat(path);
      if (!metadata.isFile() || metadata.size !== entry.size_bytes)
        return err(this.failure("Stored local model is absent or has an unexpected size."));
      const bytes = await readFile(path);
      if (sha256(bytes) !== entry.sha256.toLowerCase())
        return err(this.failure("Stored local model checksum is invalid."));
      return ok({ bytes: bytes.byteLength });
    } catch {
      return err(this.failure("Stored local model is not available."));
    }
  }

  private modelPath(entry: LocalModelCatalogEntry): string {
    const modelId = entry.model_id;
    if (!/^[a-zA-Z0-9._-]+$/u.test(modelId))
      throw new Error("Local model id contains unsupported path characters.");
    const path = resolve(this.options.storagePath, `${modelId}.bin`);
    if (dirname(path) !== resolve(this.options.storagePath))
      throw new Error("Local model path escaped the configured storage directory.");
    return path;
  }

  private failure(message: string): ErrorInfo {
    return { code: "NOVA-AI002", message, retryable: false };
  }
}

const tierRank = (tier: HardwareTier): number =>
  tier === "High" ? 2 : tier === "Standard" ? 1 : 0;

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const isValidSha256 = (value: string): boolean => /^[a-f0-9]{64}$/iu.test(value);

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
