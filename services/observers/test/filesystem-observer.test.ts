import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryCommunicationBus } from "@nova/shared";
import { FilesystemObserver } from "../src/filesystem-observer.js";

describe("FilesystemObserver", () => {
  const makeObserver = () => {
    const root = mkdtempSync(join(tmpdir(), "nova-observer-"));
    const bus = new InMemoryCommunicationBus();
    const observer = new FilesystemObserver({
      grantedScopes: [root],
      hashThresholdBytes: 1024,
      bus,
      now: () => "2026-08-21T12:30:00.000Z",
    });
    return { root, bus, observer };
  };

  it("requires permission before capture and becomes active only after enabling", async () => {
    const { root, observer } = makeObserver();
    const path = join(root, "report.txt");

    const denied = await observer.capture({
      type: "created",
      path,
      sizeBytes: 5,
      content: "hello",
    });
    const enabled = observer.enable();
    const accepted = await observer.capture({
      type: "created",
      path,
      sizeBytes: 5,
      content: "hello",
    });

    expect(denied).toMatchObject({ ok: false, error: { code: "NOVA-TL005" } });
    expect(enabled).toEqual({ ok: true, value: "Active" });
    expect(accepted).toMatchObject({ ok: true });
  });

  it("normalizes a file event with canonical path, hash, metadata, and correlation id", async () => {
    const { root, bus, observer } = makeObserver();
    const received: unknown[] = [];
    bus.subscribe("observer.filesystem.file_created", async (message) => {
      received.push(message);
    });
    observer.enable();

    await observer.capture({
      type: "created",
      path: join(root, "report.txt"),
      sizeBytes: 5,
      content: "hello",
      correlationId: randomUUID(),
    });
    await observer.flush();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      topic: "observer.filesystem.file_created",
      schema_version: "1.0.0",
      payload: {
        entity_ref: join(root, "report.txt"),
        file_type: ".txt",
        content_hash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      },
    });
  });

  it("coalesces duplicate path and event pairs within the debounce flush", async () => {
    const { root, bus, observer } = makeObserver();
    const received: unknown[] = [];
    bus.subscribe("observer.filesystem.file_modified", async (message) => {
      received.push(message);
    });
    observer.enable();
    const path = join(root, "report.txt");

    await observer.capture({ type: "modified", path, sizeBytes: 1, content: "a" });
    await observer.capture({ type: "modified", path, sizeBytes: 1, content: "b" });
    await observer.flush();

    expect(received).toHaveLength(1);
  });

  it("emits a bulk_change event for more than fifty pending changes", async () => {
    const { root, bus, observer } = makeObserver();
    const received: unknown[] = [];
    bus.subscribe("observer.filesystem.bulk_change", async (message) => {
      received.push(message);
    });
    observer.enable();

    for (let index = 0; index < 51; index += 1) {
      await observer.capture({
        type: "created",
        path: join(root, `file-${index}.txt`),
        sizeBytes: 5,
        content: "hello",
      });
    }
    await observer.flush();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ topic: "observer.filesystem.bulk_change" });
    expect((received[0] as { payload: { events: unknown[] } }).payload.events).toHaveLength(51);
  });

  it("rejects out-of-scope paths and symlink escapes after canonicalization", async () => {
    const { root, observer } = makeObserver();
    const outside = mkdtempSync(join(tmpdir(), "nova-outside-"));
    const outsideFile = join(outside, "secret.txt");
    writeFileSync(outsideFile, "secret");
    const linkPath = join(root, "linked.txt");
    symlinkSync(outsideFile, linkPath);
    observer.enable();

    const outsideResult = await observer.capture({
      type: "created",
      path: join(outside, "other.txt"),
      sizeBytes: 1,
    });
    const symlinkResult = await observer.capture({ type: "created", path: linkPath, sizeBytes: 6 });

    expect(outsideResult).toMatchObject({ ok: false, error: { code: "NOVA-TL005" } });
    expect(symlinkResult).toMatchObject({ ok: false, error: { code: "NOVA-TL005" } });
  });

  it("purges pending events immediately when permission is revoked", async () => {
    const { root, bus, observer } = makeObserver();
    const received: unknown[] = [];
    bus.subscribe("observer.filesystem.file_created", async (message) => {
      received.push(message);
    });
    observer.enable();
    await observer.capture({
      type: "created",
      path: join(root, "pending.txt"),
      sizeBytes: 1,
      content: "x",
    });

    const revoked = observer.revoke();
    await observer.flush();

    expect(revoked).toEqual({ ok: true, value: "Disabled" });
    expect(received).toHaveLength(0);
    expect(observer.state()).toBe("Disabled");
  });
});
