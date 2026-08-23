import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { InMemoryCommunicationBus, createMessage } from "../src/communication-bus.js";
import { MemoryLogSink, StructuredLogger } from "../src/structured-logger.js";

describe("InMemoryCommunicationBus", () => {
  const message = () =>
    createMessage({
      topic: "system.test",
      schema_version: "1.0.0",
      correlation_id: randomUUID(),
      source_service: "test",
      payload: { value: 1 },
    });

  it("publishes a valid message to subscribers", async () => {
    const bus = new InMemoryCommunicationBus();
    const handler = vi.fn(async () => undefined);
    bus.subscribe("system.test", handler);

    const result = await bus.publish(message());

    expect(result).toEqual({ ok: true, value: undefined });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not process a duplicate message id twice", async () => {
    const bus = new InMemoryCommunicationBus();
    const handler = vi.fn(async () => undefined);
    bus.subscribe("system.test", handler);
    const original = message();

    await bus.publish(original);
    await bus.publish(original);

    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns a retryable event error when a subscriber fails before the retry budget is exhausted", async () => {
    const bus = new InMemoryCommunicationBus();
    bus.subscribe("system.test", async () => {
      throw new Error("temporary failure");
    });

    const result = await bus.publish(message());

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-EVT002", retryable: true } });
    expect(bus.deadLetters()).toHaveLength(0);
  });

  it("dead-letters a poison message after three failed deliveries", async () => {
    const bus = new InMemoryCommunicationBus();
    bus.subscribe("system.test", async () => {
      throw new Error("poison");
    });
    const original = message();

    await bus.publish(original);
    await bus.publish(original);
    const finalResult = await bus.publish(original);

    expect(finalResult).toEqual({ ok: true, value: undefined });
    expect(bus.deadLetters()).toHaveLength(1);
    expect(bus.deadLetters()[0]?.error.code).toBe("NOVA-EVT002");
  });

  it("logs publish, delivery, and dead-letter checkpoints without recording payload data", async () => {
    const sink = new MemoryLogSink();
    const logger = new StructuredLogger({
      service: "communication.bus",
      sink,
      minimumLevel: "debug",
    });
    const bus = new InMemoryCommunicationBus(logger);
    bus.subscribe("system.test", async () => undefined);

    await bus.publish(message());

    expect(sink.records().map((record) => record.event)).toEqual([
      "bus.publish.received",
      "bus.delivery.succeeded",
      "bus.publish.completed",
    ]);
    expect(sink.records().every((record) => record.correlation_id !== undefined)).toBe(true);
    expect(JSON.stringify(sink.records())).not.toContain("value");
  });

  it("rejects an invalid message envelope before delivery", async () => {
    const bus = new InMemoryCommunicationBus();
    const result = await bus.publish({ topic: "", payload: {} } as never);

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-EVT001", retryable: false } });
  });
});
