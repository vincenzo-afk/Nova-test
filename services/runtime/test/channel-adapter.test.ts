import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import { describe, expect, it, vi } from "vitest";
import {
  ChannelManager,
  type ChannelAdapter,
  type InboundMessage,
} from "../src/channel-adapter.js";

const adapter = (authorized = true): ChannelAdapter => ({
  channel_id: "telegram",
  descriptor: {
    provider_id: "telegram",
    domain: "messaging-channel",
    privacy_class: "cloud",
    schema_version: "1.0.0",
    capabilities: ["send_message", "receive_message"],
    cost_per_request: 0,
    latency_p50_ms: 50,
  },
  healthCheck: vi.fn(async () => "reachable" as const),
  invoke: vi.fn(async (request: Readonly<Record<string, unknown>>) => request),
  cancel: vi.fn(),
  shutdown: vi.fn(),
  sendMessage: vi.fn(async (chatId, content) => ({
    message_id: `msg-${chatId}`,
    status: "sent",
    chat_id: chatId,
    content,
  })),
  onMessage: vi.fn(),
  supportsMedia: () => ({ images: true, audio: true, files: true }),
  resolveIdentity: () => ({ identity_id: "nova-user", authorized }),
});

describe("ChannelManager", () => {
  it("exposes the shared messaging-provider descriptor and lifecycle contract", async () => {
    const telegram = adapter();

    expect(telegram.descriptor).toMatchObject({
      provider_id: "telegram",
      domain: "messaging-channel",
      privacy_class: "cloud",
      schema_version: "1.0.0",
    });
    expect(await telegram.healthCheck()).toBe("reachable");
    telegram.cancel("request-1");
    telegram.shutdown();
  });

  it("rejects provider metadata that does not describe a messaging channel", () => {
    const manager = new ChannelManager();
    const invalid = {
      ...adapter(),
      descriptor: { ...adapter().descriptor, domain: "llm" },
    } as ChannelAdapter;

    expect(manager.register(invalid)).toMatchObject({
      ok: false,
      error: { code: "NOVA-AI002" },
    });
  });

  it("unregisters a channel provider through its terminal shutdown lifecycle", () => {
    const manager = new ChannelManager();
    const telegram = adapter();
    manager.register(telegram);

    expect(manager.unregister("telegram")).toMatchObject({ ok: true });
    expect(telegram.shutdown).toHaveBeenCalledOnce();
    expect(manager.mediaCapabilities("telegram")).toMatchObject({
      ok: false,
      error: { code: "NOVA-AI002" },
    });
  });

  it("registers one adapter per channel and normalizes inbound messages", () => {
    const manager = new ChannelManager();
    const telegram = adapter();
    const received: InboundMessage[] = [];
    manager.subscribe((message) => received.push(message));

    expect(manager.register(telegram)).toMatchObject({ ok: true });
    expect(manager.register(telegram)).toMatchObject({ ok: false, error: { code: "NOVA-AI002" } });
    expect(
      manager.receive("telegram", {
        sender_id: "chat-user",
        chat_id: "chat-1",
        text: "hello",
        attachments: [],
      }),
    ).toMatchObject({ ok: true });
    expect(received).toEqual([
      {
        channel_id: "telegram",
        sender_id: "chat-user",
        chat_id: "chat-1",
        text: "hello",
        attachments: [],
      },
    ]);
  });

  it("rejects unrecognized identities for inbound commands", () => {
    const sink = new MemoryLogSink();
    const manager = new ChannelManager(new StructuredLogger({ service: "runtime.channels", sink }));
    const telegram = adapter(false);
    const received: InboundMessage[] = [];
    manager.subscribe((message) => received.push(message));
    manager.register(telegram);

    expect(
      manager.receive("telegram", {
        sender_id: "unrecognized-user",
        chat_id: "chat-1",
        text: "private command text",
        attachments: [],
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(received).toEqual([]);
    expect(sink.records().at(-1)?.event).toBe("channel.inbound.rejected");
    expect(sink.records().at(-1)?.details).toMatchObject({
      channel_id: "telegram",
      reason: "identity_unauthorized",
    });
    expect(JSON.stringify(sink.records())).not.toContain("private command text");
    expect(JSON.stringify(sink.records())).not.toContain("unrecognized-user");
  });

  it("rejects unrecognized identities for outbound commands", async () => {
    const manager = new ChannelManager();
    const telegram = adapter(false);
    manager.register(telegram);

    expect(await manager.send("telegram", "chat-1", "delete everything")).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it("audits authorized inbound and outbound channel boundaries without payload content", async () => {
    const sink = new MemoryLogSink();
    const manager = new ChannelManager(new StructuredLogger({ service: "runtime.channels", sink }));
    const telegram = adapter();
    manager.register(telegram);
    manager.subscribe(() => undefined);

    expect(
      manager.receive("telegram", {
        sender_id: "authorized-user",
        chat_id: "chat-1",
        text: "secret inbound text",
        attachments: [],
      }),
    ).toMatchObject({ ok: true });
    expect(await manager.send("telegram", "chat-1", "secret outbound text")).toMatchObject({
      ok: true,
    });
    expect(sink.records().map((record) => record.event)).toEqual([
      "channel.adapter.registered",
      "channel.inbound.accepted",
      "channel.outbound.sent",
    ]);
    expect(JSON.stringify(sink.records())).not.toContain("secret inbound text");
    expect(JSON.stringify(sink.records())).not.toContain("secret outbound text");
  });

  it("delivers through an authorized adapter and exposes media capability limits", async () => {
    const manager = new ChannelManager();
    const telegram = adapter();
    manager.register(telegram);

    expect(await manager.send("telegram", "chat-1", "hello")).toMatchObject({
      ok: true,
      value: { status: "sent" },
    });
    expect(manager.mediaCapabilities("telegram")).toMatchObject({
      ok: true,
      value: { images: true, audio: true, files: true },
    });
    expect(telegram.sendMessage).toHaveBeenCalledWith("chat-1", "hello");
  });
});
