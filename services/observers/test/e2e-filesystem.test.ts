import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryCommunicationBus } from "@nova/shared";
import { FilesystemObserver } from "../src/filesystem-observer.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("Filesystem observer isolated E2E", () => {
  it("captures a real temporary file and delivers a hashed event through the bus", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-e2e-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "note.txt");
    await writeFile(filePath, "grounded fixture");
    const bus = new InMemoryCommunicationBus();
    const observer = new FilesystemObserver({
      grantedScopes: [directory],
      hashThresholdBytes: 1_000,
      bus,
      now: () => "2026-08-21T00:00:00.000Z",
    });
    const received: unknown[] = [];
    bus.subscribe("observer.filesystem.file_created", async (message) => {
      received.push(message);
    });

    expect(observer.enable()).toMatchObject({ ok: true, value: "Active" });
    await expect(
      observer.capture({
        type: "created",
        path: filePath,
        sizeBytes: 16,
        content: "grounded fixture",
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(observer.flush()).resolves.toMatchObject({ ok: true });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      topic: "observer.filesystem.file_created",
      payload: { entity_ref: filePath, file_type: ".txt", size_bytes: 16 },
    });
    expect(
      (received[0] as { payload: { content_hash?: string } }).payload.content_hash,
    ).toHaveLength(64);
  });

  it("does not observe a file outside the granted temporary scope", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-e2e-"));
    temporaryDirectories.push(directory);
    const bus = new InMemoryCommunicationBus();
    const observer = new FilesystemObserver({
      grantedScopes: [directory],
      hashThresholdBytes: 100,
      bus,
    });
    expect(observer.enable().ok).toBe(true);

    const result = await observer.capture({
      type: "created",
      path: join(tmpdir(), "outside.txt"),
      sizeBytes: 1,
      content: "x",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL005" } });
  });
});
