import { describe, expect, it } from "vitest";
import { BackupManager, type BackupBackend } from "../src/backup-manager.js";

class MemoryBackup implements BackupBackend {
  readonly files = new Map<string, string>();
  write(id: string, contents: string): void {
    this.files.set(id, contents);
  }
  read(id: string): string | undefined {
    return this.files.get(id);
  }
  delete(id: string): void {
    this.files.delete(id);
  }
  list(): readonly string[] {
    return [...this.files.keys()];
  }
}

describe("BackupManager", () => {
  it("creates a unified encrypted snapshot and restores only for the producing owner", () => {
    const backend = new MemoryBackup();
    const manager = new BackupManager(backend, {
      ownerId: "desktop-user",
      retentionCount: 3,
      encrypt: (plain) => Buffer.from(plain).toString("base64"),
      decrypt: (cipher) => Buffer.from(cipher, "base64").toString("utf8"),
    });
    const state = {
      memory: [{ id: "m1", text: "private" }],
      graph: { nodes: ["n1"] },
      config: { version: 1 },
    };

    const created = manager.create(state);

    expect(created).toMatchObject({
      ok: true,
      value: { owner_id: "desktop-user", encrypted: true },
    });
    expect(backend.files.get(created.ok ? created.value.snapshot_id : "")).not.toContain("private");
    expect(manager.restore(created.ok ? created.value.snapshot_id : "")).toMatchObject({
      ok: true,
      value: state,
    });
    expect(
      new BackupManager(backend, {
        ownerId: "other-user",
        encrypt: (plain) => Buffer.from(plain).toString("base64"),
        decrypt: (cipher) => Buffer.from(cipher, "base64").toString("utf8"),
      }).restore(created.ok ? created.value.snapshot_id : ""),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });

  it("rejects corrupted snapshots and prunes older snapshots by retention count", () => {
    const backend = new MemoryBackup();
    let now = 1000;
    const manager = new BackupManager(backend, {
      ownerId: "desktop-user",
      retentionCount: 2,
      now: () => now,
      idFactory: () => `snap-${now}`,
      encrypt: (plain) => Buffer.from(plain).toString("base64"),
      decrypt: (cipher) => Buffer.from(cipher, "base64").toString("utf8"),
    });
    manager.create({ value: 1 });
    now = 2000;
    manager.create({ value: 2 });
    now = 3000;
    const latest = manager.create({ value: 3 });

    expect(backend.list()).toEqual(["snap-2000", "snap-3000"]);
    const id = latest.ok ? latest.value.snapshot_id : "";
    backend.files.set(id, "corrupt");
    expect(manager.restore(id)).toMatchObject({ ok: false, error: { code: "NOVA-EVT002" } });
  });

  it("supports explicit pre-update snapshots", () => {
    const backend = new MemoryBackup();
    const manager = new BackupManager(backend, {
      ownerId: "desktop-user",
      encrypt: (plain) => Buffer.from(plain).toString("base64"),
      decrypt: (cipher) => Buffer.from(cipher, "base64").toString("utf8"),
    });

    expect(manager.preUpdate({ schema_version: "1.0.0" })).toMatchObject({
      ok: true,
      value: { reason: "pre-update" },
    });
  });
});
