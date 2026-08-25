import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WebhookManager } from "../src/webhook-manager.js";

describe("WebhookManager", () => {
  it("delivers only subscribed topics with a verifiable HMAC signature", async () => {
    const deliveries: Array<{ body: string; signature: string }> = [];
    const manager = new WebhookManager({
      send: async (_url, body, headers) => {
        deliveries.push({ body, signature: headers["x-nova-signature"] ?? "" });
      },
    });
    const registration = manager.register({
      url: "https://example.test/nova",
      topics: ["task.progress.task-1"],
    });

    await manager.publish({ topic: "system.status", payload: { state: "healthy" } });
    await manager.publish({ topic: "task.progress.task-1", payload: { state: "completed" } });

    expect(deliveries).toHaveLength(1);
    const delivered = JSON.parse(deliveries[0]?.body ?? "{}") as Record<string, unknown>;
    const signature = delivered.signature;
    delete delivered.signature;
    const expected = createHmac("sha256", registration.secret)
      .update(JSON.stringify(delivered))
      .digest("hex");
    expect(deliveries[0]?.signature).toBe(expected);
    expect(signature).toBe(expected);
    expect(delivered).toMatchObject({
      topic: "task.progress.task-1",
      payload: { state: "completed" },
    });
  });

  it("returns a privacy-safe health summary without callback URL or secret", () => {
    const manager = new WebhookManager({});
    const registration = manager.register({
      url: "https://example.test/nova",
      topics: ["system.status"],
    });

    expect(manager.healthSummary(registration.id)).toEqual({
      id: registration.id,
      topics: ["system.status"],
      status: "healthy",
      failure_count: 0,
    });
  });

  it("retries with backoff, flags unhealthy after exhaustion, and re-enables after a healthy delivery", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const manager = new WebhookManager({
      maxAttempts: 3,
      baseDelayMs: 10,
      sleep: async (delay) => sleeps.push(delay),
      send: async () => {
        attempts += 1;
        if (attempts <= 3) throw new Error("offline");
      },
    });
    const registration = manager.register({
      url: "https://example.test/nova",
      topics: ["system.status"],
    });

    await expect(
      manager.publish({ topic: "system.status", payload: { state: "degraded" } }),
    ).rejects.toThrow("offline");
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([10, 20]);
    expect(manager.health(registration.id)).toMatchObject({
      status: "unhealthy",
      failure_count: 1,
    });

    await manager.publish({ topic: "system.status", payload: { state: "recovered" } });
    expect(manager.health(registration.id)).toMatchObject({ status: "healthy", failure_count: 0 });
  });
});
