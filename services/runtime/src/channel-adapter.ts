import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

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

export interface ChannelAdapter {
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

  public register(adapter: ChannelAdapter): Result<void> {
    if (this.adapters.has(adapter.channel_id))
      return err(this.error("Channel adapter is already registered."));
    this.adapters.set(adapter.channel_id, adapter);
    adapter.onMessage((message) => {
      for (const handler of this.handlers) handler(this.normalize(adapter.channel_id, message));
    });
    return ok(undefined);
  }

  public subscribe(handler: InboundHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public receive(channelId: string, message: Omit<InboundMessage, "channel_id">): Result<void> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) return err(this.error("Channel adapter is unavailable."));
    const normalized = this.normalize(channelId, message);
    for (const handler of this.handlers) handler(normalized);
    return ok(undefined);
  }

  public async send(
    channelId: string,
    chatId: string,
    content: string,
  ): Promise<Result<DeliveryReceipt>> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) return err(this.error("Channel adapter is unavailable."));
    if (!adapter.resolveIdentity(chatId).authorized)
      return err(this.securityError("Channel identity is not authorized."));
    try {
      return ok(await adapter.sendMessage(chatId, content));
    } catch {
      return err({ code: "NOVA-AI002", message: "Channel delivery failed.", retryable: true });
    }
  }

  public mediaCapabilities(channelId: string): Result<MediaCapabilities> {
    const adapter = this.adapters.get(channelId);
    return adapter
      ? ok(adapter.supportsMedia())
      : err(this.error("Channel adapter is unavailable."));
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
