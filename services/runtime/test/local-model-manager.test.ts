import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import type { HardwareProfile } from "../src/hardware-detection.js";
import { LocalModelManager, type LocalModelCatalogEntry } from "../src/local-model-manager.js";

const hardware = (overall_tier: HardwareProfile["overall_tier"]): HardwareProfile => ({
  scanned_at: "2026-08-24T00:00:00.000Z",
  signals: {
    cpu_architecture: "x86_64",
    cpu_cores: 8,
    avx2: true,
    avx512: false,
    gpu_vendor: null,
    gpu_vram_gb: 0,
    gpu_accelerator: null,
    system_ram_gb: overall_tier === "Minimal" ? 8 : overall_tier === "Standard" ? 16 : 32,
    available_disk_gb: 100,
    os: "linux",
    battery_powered: false,
  },
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
});

const catalog: readonly LocalModelCatalogEntry[] = [
  {
    model_id: "whisper-small-v1",
    provider_id: "local.whisper.small",
    domain: "speech-to-text",
    download_url: "https://models.example.test/whisper-small-v1.bin",
    sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
    size_bytes: 3,
    minimum_hardware_tier: "Minimal",
    adapter_id: "whisper",
  },
  {
    model_id: "whisper-large-v1",
    provider_id: "local.whisper.large",
    domain: "speech-to-text",
    download_url: "https://models.example.test/whisper-large-v1.bin",
    sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
    size_bytes: 3,
    minimum_hardware_tier: "High",
    adapter_id: "whisper",
  },
];

const bytes = Uint8Array.from([1, 2, 3]);

async function makeManager(
  root: string,
  options: {
    readonly logger?: StructuredLogger;
    readonly fetchModel?: (url: string) => Promise<Uint8Array>;
  } = {},
): Promise<LocalModelManager> {
  return new LocalModelManager({
    storagePath: root,
    catalog,
    fetchModel: options.fetchModel ?? vi.fn(async () => bytes),
    loadAdapter: vi.fn(async (entry, path) => ({
      model_id: entry.model_id,
      provider_id: entry.provider_id,
      path,
    })),
    logger: options.logger,
  });
}

describe("LocalModelManager", () => {
  it("discovers every catalog entry with advisory hardware availability", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-models-"));
    try {
      const manager = await makeManager(root);

      expect(manager.discover(hardware("Minimal"))).toMatchObject([
        { model_id: "whisper-small-v1", availability: "recommended" },
        {
          model_id: "whisper-large-v1",
          availability: "available-but-unrecommended",
          reason: "hardware_below_minimum_tier",
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("downloads over HTTPS, verifies SHA-256, and atomically stores the model", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-models-"));
    try {
      const fetchModel = vi.fn(async (url: string) => {
        expect(url).toBe(catalog[0]?.download_url);
        return bytes;
      });
      const manager = await makeManager(root, { fetchModel });

      const result = await manager.download("whisper-small-v1");

      expect(result).toMatchObject({
        ok: true,
        value: {
          model_id: "whisper-small-v1",
          sha256: catalog[0]?.sha256,
          bytes: 3,
          status: "downloaded",
        },
      });
      expect(await readFile(join(root, "whisper-small-v1.bin"))).toEqual(Buffer.from(bytes));
      expect(fetchModel).toHaveBeenCalledOnce();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("shares one in-flight download between concurrent requests for the same model", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-models-"));
    try {
      const fetchModel = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return bytes;
      });
      const manager = await makeManager(root, { fetchModel });

      const results = await Promise.all([
        manager.download("whisper-small-v1"),
        manager.download("whisper-small-v1"),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ ok: true, value: { status: "downloaded" } });
      expect(results[1]).toMatchObject({ ok: true, value: { status: "downloaded" } });
      expect(fetchModel).toHaveBeenCalledOnce();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a checksum mismatch without replacing an existing model", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-models-"));
    try {
      const manager = await makeManager(root, {
        fetchModel: vi.fn(async () => Uint8Array.from([9, 9, 9])),
      });

      const result = await manager.download("whisper-small-v1");

      expect(result).toMatchObject({
        ok: false,
        error: { code: "NOVA-AI002", retryable: false },
      });
      await expect(readFile(join(root, "whisper-small-v1.bin"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists reclaimable models without paths, URLs, or checksums", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-models-"));
    try {
      const manager = await makeManager(root);
      await manager.download("whisper-small-v1");
      expect(manager.markRetired("whisper-small-v1")).toMatchObject({ ok: true });

      expect(manager.reclaimableSummaries()).toEqual([
        {
          model_id: "whisper-small-v1",
          provider_id: "local.whisper.small",
          domain: "speech-to-text",
          status: "reclaimable",
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("loads a verified model and tracks explicit retirement without deleting bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-models-"));
    try {
      const sink = new MemoryLogSink();
      const manager = await makeManager(root, {
        logger: new StructuredLogger({ service: "runtime.models", sink }),
      });
      await manager.download("whisper-small-v1");

      expect(await manager.load("whisper-small-v1")).toMatchObject({
        ok: true,
        value: { model_id: "whisper-small-v1", provider_id: "local.whisper.small" },
      });
      expect(manager.markRetired("whisper-small-v1")).toMatchObject({
        ok: true,
        value: { model_id: "whisper-small-v1", status: "reclaimable" },
      });
      expect(manager.reclaimable()).toMatchObject([{ model_id: "whisper-small-v1" }]);
      expect(await readFile(join(root, "whisper-small-v1.bin"))).toEqual(Buffer.from(bytes));
      expect(sink.records().map((record) => record.event)).toEqual([
        "model.download.completed",
        "model.loaded",
        "model.retirement.marked",
      ]);
      expect(JSON.stringify(sink.records())).not.toContain("opaque");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
