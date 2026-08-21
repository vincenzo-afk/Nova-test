import { describe, expect, it, vi } from "vitest";
import {
  OfflineActionQueue,
  ResourceArbitrator,
  type OfflineAction,
} from "../src/resource-arbitration.js";

describe("ResourceArbitrator", () => {
  it("queues remote requests behind local use and grants them after release", () => {
    const manager = new ResourceArbitrator();

    expect(manager.acquire("microphone", { request_id: "local", origin: "local" })).toMatchObject({
      ok: true,
      value: { status: "Granted" },
    });
    expect(manager.acquire("microphone", { request_id: "remote", origin: "remote" })).toMatchObject(
      { ok: true, value: { status: "Queued" } },
    );
    expect(manager.release("microphone", "local")).toMatchObject({
      ok: true,
      value: { granted_request_id: "remote" },
    });
  });

  it("allows an explicit remote-priority override but never silently preempts by default", () => {
    const manager = new ResourceArbitrator();
    manager.acquire("camera", { request_id: "local", origin: "local" });

    expect(
      manager.acquire("camera", {
        request_id: "remote",
        origin: "remote",
        explicit_remote_override: true,
      }),
    ).toMatchObject({ ok: true, value: { status: "Granted" } });
  });
});

describe("OfflineActionQueue", () => {
  it("keeps offline actions distinct from failures and retries automatically on reconnect", async () => {
    const execute = vi.fn(async (action: OfflineAction) => ({
      action_id: action.action_id,
      status: "completed" as const,
    }));
    const queue = new OfflineActionQueue(execute);
    queue.setOnline(false);

    expect(
      await queue.submit({ action_id: "remote-1", description: "use desktop GPU" }),
    ).toMatchObject({ ok: true, value: { status: "QueuedOffline" } });
    expect(execute).not.toHaveBeenCalled();
    expect(await queue.reconnect()).toMatchObject({
      ok: true,
      value: [{ action_id: "remote-1", status: "completed" }],
    });
    expect(execute).toHaveBeenCalledOnce();
  });
});
