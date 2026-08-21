import { describe, expect, it, vi } from "vitest";
import {
  ChannelManager,
  type ChannelAdapter,
  type InboundMessage,
} from "../src/channel-adapter.js";

const adapter = (authorized = true): ChannelAdapter => ({
  channel_id: "telegram",
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
