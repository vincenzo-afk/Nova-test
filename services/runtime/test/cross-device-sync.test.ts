import { describe, expect, it, vi } from "vitest";
import {
  CrossDeviceSyncManager,
  type SyncChange,
  type SyncTransport,
} from "../src/cross-device-sync.js";

const change = (overrides: Partial<SyncChange> = {}): SyncChange => ({
  change_id: "change-1",
  entity_id: "memory-1",
  category: "episodic_memory",
  logical_clock: 1,
  partition: "personal",
  fields: { title: "hello", body: "one" },
  ...overrides,
});

describe("CrossDeviceSyncManager", () => {
  it("pulls encrypted envelopes from a logical checkpoint and resumes incrementally", async () => {
    const pull = vi
      .fn()
      .mockResolvedValueOnce({ next_clock: 1, envelopes: [JSON.stringify(change())] })
      .mockResolvedValueOnce({
        next_clock: 2,
        envelopes: [
          JSON.stringify(
            change({ change_id: "change-2", logical_clock: 2, fields: { body: "two" } }),
          ),
        ],
      });
    const transport: SyncTransport = {
      pull,
      encrypt: (payload) => payload,
      decrypt: (payload) => payload,
    };
    const manager = new CrossDeviceSyncManager(transport, {
      granted_partitions: new Set(["personal"]),
    });

    expect(await manager.sync()).toMatchObject({
      ok: true,
      value: { checkpoint: 1, applied_change_ids: ["change-1"] },
    });
    expect(await manager.sync()).toMatchObject({
      ok: true,
      value: { checkpoint: 2, applied_change_ids: ["change-2"] },
    });
    expect(pull).toHaveBeenNthCalledWith(1, 0);
    expect(pull).toHaveBeenNthCalledWith(2, 1);
  });

  it("applies sync priority and filters partitions before local application", async () => {
    const changes = [
      change({
        change_id: "graph",
        category: "knowledge_graph",
        partition: "work",
        logical_clock: 1,
      }),
      change({ change_id: "security", category: "security", logical_clock: 2 }),
      change({ change_id: "task", category: "task_state", logical_clock: 3 }),
      change({ change_id: "memory", category: "episodic_memory", logical_clock: 4 }),
    ];
    const transport: SyncTransport = {
      pull: async () => ({ next_clock: 4, envelopes: changes.map(JSON.stringify) }),
      encrypt: (payload) => payload,
      decrypt: (payload) => payload,
    };
    const manager = new CrossDeviceSyncManager(transport, {
      granted_partitions: new Set(["personal"]),
    });

    await manager.sync();

    expect(manager.appliedChangeIds()).toEqual(["security", "task", "memory"]);
  });

  it("resolves concurrent edits per field with last-write-wins while retaining history", async () => {
    const transport: SyncTransport = {
      pull: async () => ({
        next_clock: 2,
        envelopes: [JSON.stringify(change({ logical_clock: 2, fields: { title: "new" } }))],
      }),
      encrypt: (payload) => payload,
      decrypt: (payload) => payload,
    };
    const manager = new CrossDeviceSyncManager(transport, {
      granted_partitions: new Set(["personal"]),
    });
    manager.applyLocal(change({ logical_clock: 3, fields: { body: "local" } }));

    await manager.sync();

    expect(manager.record("memory-1")).toMatchObject({ fields: { title: "new", body: "local" } });
    expect(manager.history("memory-1")).toHaveLength(2);
  });

  it("queues local changes offline and retries idempotently after reconnect", async () => {
    let online = false;
    const push = vi.fn(async () => {
      if (!online) throw new Error("offline");
    });
    const transport: SyncTransport = {
      pull: async () => ({ next_clock: 0, envelopes: [] }),
      push,
      encrypt: (payload) => payload,
      decrypt: (payload) => payload,
    };
    const manager = new CrossDeviceSyncManager(transport, {
      granted_partitions: new Set(["personal"]),
    });
    manager.applyLocal(change({ change_id: "local-1" }));

    expect(await manager.flush()).toMatchObject({ ok: false, error: { code: "NOVA-EVT001" } });
    online = true;
    expect(await manager.flush()).toMatchObject({
      ok: true,
      value: { pushed_change_ids: ["local-1"] },
    });
    expect(await manager.flush()).toMatchObject({ ok: true, value: { pushed_change_ids: [] } });
  });
});
