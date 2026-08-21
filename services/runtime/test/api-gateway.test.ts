import { describe, expect, it, vi } from "vitest";
import { InMemoryCommunicationBus, createMessage } from "@nova/shared";
import { ApiGateway } from "../src/api-gateway.js";

describe("ApiGateway", () => {
  it("routes a UI request through the bus and publishes a correlated reply", async () => {
    const bus = new InMemoryCommunicationBus();
    const gateway = new ApiGateway(bus);
    const handler = vi.fn(async (payload: unknown) => ({ accepted: payload }));
    gateway.register("task.submit", handler);
    await gateway.start();
    const replies: unknown[] = [];
    bus.subscribe("api.internal.response", async (message) => {
      replies.push(message);
    });

    const result = await bus.publish(
      createMessage({
        topic: "api.internal.request",
        schema_version: "1.0.0",
        correlation_id: "00000000-0000-4000-8000-000000000010",
        source_service: "ui.layer",
        payload: {
          operation: "task.submit",
          request_id: "req-1",
          reply_to: "api.internal.response",
          data: { goal: "status" },
        },
      }),
    );

    expect(result).toMatchObject({ ok: true });
    expect(handler).toHaveBeenCalledWith({ goal: "status" });
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({
      topic: "api.internal.response",
      correlation_id: "00000000-0000-4000-8000-000000000010",
      payload: { request_id: "req-1", ok: true, data: { accepted: { goal: "status" } } },
    });
    await gateway.stop();
  });

  it("rejects an unknown operation with a stable typed error reply", async () => {
    const bus = new InMemoryCommunicationBus();
    const gateway = new ApiGateway(bus);
    await gateway.start();
    const replies: unknown[] = [];
    bus.subscribe("api.internal.response", async (message) => {
      replies.push(message);
    });

    await bus.publish(
      createMessage({
        topic: "api.internal.request",
        schema_version: "1.0.0",
        correlation_id: "00000000-0000-4000-8000-000000000011",
        source_service: "ui.layer",
        payload: {
          operation: "unknown",
          request_id: "req-2",
          reply_to: "api.internal.response",
          data: {},
        },
      }),
    );

    expect(replies[0]).toMatchObject({
      payload: { request_id: "req-2", ok: false, error: { code: "NOVA-TL004" } },
    });
    await gateway.stop();
  });
});
