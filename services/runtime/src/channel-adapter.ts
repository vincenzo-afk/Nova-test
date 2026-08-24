import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";
import type { Provider } from "./provider-registry.js";

export interface InboundMessage {
  readonly channel_id: string;
  readonly sender_id: string;
  readonly chat_id: string;
  readonly text: string;
  readonly attachments: readonly unknown[];
}

export interface DeliveryReceipt {
  readonly message_id: string;
  readonly status: "sent" | "failed";
  readonly chat_id: string;
  readonly content: string;
}

export interface MediaCapabilities {
  readonly images: boolean;
  readonly audio: boolean;
  readonly files: boolean;
}

export interface UserIdentityRef {
  readonly identity_id: string;
  readonly authorized: boolean;
}

export interface ChannelAdapter extends Provider {
  readonly channel_id: string;
  readonly sendMessage: (chatId: string, content: string) => Promise<DeliveryReceipt>;
  readonly onMessage: (handler: (message: InboundMessage) => void) => void;
  readonly supportsMedia: () => MediaCapabilities;
  readonly resolveIdentity: (senderOrChatId: string) => UserIdentityRef;
}

export type InboundHandler = (message: InboundMessage) => void;

export class ChannelManager {
  private readonly adapters = new Map<string, ChannelAdapter>();
  private readonly handlers = new Set<InboundHandler>();
  private readonly logger: StructuredLogger | undefined;

  public constructor(logger?: StructuredLogger) {
    this.logger = logger;
  }

  public register(adapter: ChannelAdapter): Result<void> {
    if (this.adapters.has(adapter.channel_id))
      return err(this.error("Channel adapter is already registered."));
    if (
      adapter.descriptor.provider_id !== adapter.channel_id ||
      adapter.descriptor.domain !== "messaging-channel"
    ) {
      return err(this.error("Channel adapter provider metadata is invalid."));
    }
    this.adapters.set(adapter.channel_id, adapter);
    adapter.onMessage((message) => {
      if (this.adapters.get(adapter.channel_id) === adapter) this.dispatchInbound(adapter, message);
    });
    this.logger?.info("channel.adapter.registered", {
      channel_id: adapter.channel_id,
      provider_id: adapter.descriptor.provider_id,
      schema_version: adapter.descriptor.schema_version,
    });
    return ok(undefined);
  }

  public unregister(channelId: string): Result<void> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) return err(this.error("Channel adapter is unavailable."));
    adapter.shutdown();
    this.adapters.delete(channelId);
    this.logger?.info("channel.adapter.unregistered", { channel_id: channelId });
    return ok(undefined);
  }

  public subscribe(handler: InboundHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public receive(channelId: string, message: Omit<InboundMessage, "channel_id">): Result<void> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) return err(this.error("Channel adapter is unavailable."));
    return this.dispatchInbound(adapter, message);
  }

  public async send(
    channelId: string,
    chatId: string,
    content: string,
  ): Promise<Result<DeliveryReceipt>> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) return err(this.error("Channel adapter is unavailable."));
    if (!adapter.resolveIdentity(chatId).authorized) {
      this.logger?.warning("channel.outbound.rejected", {
        channel_id: channelId,
        reason: "identity_unauthorized",
      });
      return err(this.securityError("Channel identity is not authorized."));
    }
    try {
      const receipt = await adapter.sendMessage(chatId, content);
      this.logger?.info("channel.outbound.sent", {
        channel_id: channelId,
        status: receipt.status,
      });
      return ok(receipt);
    } catch {
      this.logger?.warning("channel.outbound.failed", {
        channel_id: channelId,
        reason: "delivery_failed",
      });
      return err({ code: "NOVA-AI002", message: "Channel delivery failed.", retryable: true });
    }
  }

  public mediaCapabilities(channelId: string): Result<MediaCapabilities> {
    const adapter = this.adapters.get(channelId);
    return adapter
      ? ok(adapter.supportsMedia())
      : err(this.error("Channel adapter is unavailable."));
  }

  private dispatchInbound(
    adapter: ChannelAdapter,
    message: Omit<InboundMessage, "channel_id"> | InboundMessage,
  ): Result<void> {
    if (!adapter.resolveIdentity(message.sender_id).authorized) {
      this.logger?.warning("channel.inbound.rejected", {
        channel_id: adapter.channel_id,
        reason: "identity_unauthorized",
      });
      return err(this.securityError("Channel identity is not authorized."));
    }
    const normalized = this.normalize(adapter.channel_id, message);
    for (const handler of this.handlers) handler(normalized);
    this.logger?.info("channel.inbound.accepted", {
      channel_id: adapter.channel_id,
      attachment_count: normalized.attachments.length,
    });
    return ok(undefined);
  }

  private normalize(
    channelId: string,
    message: Omit<InboundMessage, "channel_id"> | InboundMessage,
  ): InboundMessage {
    return {
      channel_id: channelId,
      sender_id: message.sender_id,
      chat_id: message.chat_id,
      text: message.text,
      attachments: [...message.attachments],
    };
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-AI002", message, retryable: false };
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
