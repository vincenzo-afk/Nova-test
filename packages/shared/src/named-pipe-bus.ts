import { createHash } from "node:crypto";
import { createServer, createConnection, type Server, type Socket } from "node:net";
import { unlink } from "node:fs/promises";
import {
  err,
  messageEnvelopeSchema,
  ok,
  retryPolicy,
  type ErrorInfo,
  type MessageEnvelope,
  type Result,
} from "./contracts.js";
import type { CommunicationBus, DeadLetter, MessageHandler } from "./communication-bus.js";

export interface NamedPipeBusOptions {
  readonly path: string;
  readonly role: "server" | "client";
}

const READY_FRAME = "__nova_bus_ready__";

export const namedPipeTransportPath = (
  path: string,
  platform: NodeJS.Platform = process.platform,
): string => {
  if (platform !== "win32") return path;
  const suffix = createHash("sha256").update(path).digest("hex").slice(0, 24);
  return `\\\\.\\pipe\\nova-${suffix}`;
};

interface Subscription {
  readonly handler: MessageHandler;
  readonly processedMessageIds: Set<string>;
}

export class NamedPipeCommunicationBus implements CommunicationBus {
  private readonly subscriptions = new Map<string, Set<Subscription>>();
  private readonly deadLetterEntries: DeadLetter[] = [];
  private readonly sockets = new Set<Socket>();
  private server: Server | undefined;
  private socket: Socket | undefined;
  private started = false;
  private clientReadyResolver: (() => void) | undefined;

  public constructor(private readonly options: NamedPipeBusOptions) {}

  public async start(): Promise<void> {
    if (this.started) return;
    if (this.options.role === "server") {
      await this.startServer();
    } else {
      await this.startClient();
    }
    this.started = true;
  }

  public subscribe<TPayload>(topic: string, handler: MessageHandler<TPayload>): () => void {
    const subscription: Subscription = {
      handler: handler as MessageHandler,
      processedMessageIds: new Set<string>(),
    };
    const subscribers = this.subscriptions.get(topic) ?? new Set<Subscription>();
    subscribers.add(subscription);
    this.subscriptions.set(topic, subscribers);
    return () => {
      subscribers.delete(subscription);
      if (subscribers.size === 0) this.subscriptions.delete(topic);
    };
  }

  public async publish<TPayload>(message: MessageEnvelope<TPayload>): Promise<Result<void>> {
    const parsed = messageEnvelopeSchema.safeParse(message);
    if (!parsed.success) return err(this.error("Message envelope failed schema validation."));
    if (!this.started) return err(this.error("Named-pipe bus is not started."));
    if (this.options.role === "client") {
      if (!this.socket || this.socket.destroyed)
        return err(this.error("Named-pipe client is not connected."));
      this.write(this.socket, message);
      return ok(undefined);
    }
    await this.dispatch(message);
    for (const socket of this.sockets) this.write(socket, message);
    return ok(undefined);
  }

  public deadLetters(): readonly DeadLetter[] {
    return [...this.deadLetterEntries];
  }

  public async close(): Promise<void> {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    this.socket?.destroy();
    this.socket = undefined;
    if (this.server) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
      if (process.platform !== "win32") {
        await unlink(namedPipeTransportPath(this.options.path)).catch(() => undefined);
      }
    }
    this.started = false;
  }

  private async startServer(): Promise<void> {
    const transportPath = namedPipeTransportPath(this.options.path);
    if (process.platform !== "win32") await unlink(transportPath).catch(() => undefined);
    this.server = createServer((socket) => {
      this.sockets.add(socket);
      this.attachSocket(socket, (message) => this.dispatch(message));
      socket.write(`${READY_FRAME}\n`);
      socket.once("close", () => this.sockets.delete(socket));
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(transportPath, () => resolve());
    });
  }

  private async startClient(): Promise<void> {
    const ready = new Promise<void>((resolve) => {
      this.clientReadyResolver = resolve;
    });
    this.socket = createConnection(namedPipeTransportPath(this.options.path));
    this.attachSocket(this.socket, async (message) => {
      await this.dispatch(message);
    });
    await new Promise<void>((resolve, reject) => {
      this.socket?.once("connect", () => resolve());
      this.socket?.once("error", reject);
    });
    await ready;
  }

  private attachSocket(socket: Socket, handler: (message: MessageEnvelope) => Promise<void>): void {
    let incoming = "";
    socket.on("data", (chunk: Buffer) => {
      incoming += chunk.toString("utf8");
      let separator = incoming.indexOf("\n");
      while (separator >= 0) {
        const frame = incoming.slice(0, separator);
        incoming = incoming.slice(separator + 1);
        separator = incoming.indexOf("\n");
        if (frame === READY_FRAME) {
          this.clientReadyResolver?.();
          this.clientReadyResolver = undefined;
        } else {
          void this.readFrame(frame, handler);
        }
      }
    });
  }

  private async readFrame(
    frame: string,
    handler: (message: MessageEnvelope) => Promise<void>,
  ): Promise<void> {
    try {
      const message = messageEnvelopeSchema.parse(JSON.parse(frame)) as MessageEnvelope;
      await handler(message);
    } catch (cause) {
      this.deadLetterEntries.push({
        message: this.fallbackMessage(),
        error: this.error(
          cause instanceof Error ? cause.message : "Named-pipe frame failed validation.",
        ),
        attempts: retryPolicy.maxRetries,
      });
    }
  }

  private async dispatch(message: MessageEnvelope): Promise<void> {
    const subscribers = this.subscriptions.get(message.topic);
    if (!subscribers) return;
    for (const subscriber of subscribers) {
      if (subscriber.processedMessageIds.has(message.message_id)) continue;
      try {
        await subscriber.handler(message);
        subscriber.processedMessageIds.add(message.message_id);
      } catch (cause) {
        this.deadLetterEntries.push({
          message,
          error: this.error(
            cause instanceof Error ? cause.message : "Subscriber failed processing event.",
          ),
          attempts: retryPolicy.maxRetries,
        });
      }
    }
  }

  private write(socket: Socket, message: MessageEnvelope): void {
    socket.write(`${JSON.stringify(message)}\n`);
  }

  private fallbackMessage(): MessageEnvelope {
    return {
      message_id: "00000000-0000-4000-8000-000000000000",
      topic: "bus.invalid_frame",
      schema_version: "1.0.0",
      timestamp: new Date().toISOString(),
      correlation_id: "00000000-0000-4000-8000-000000000000",
      source_service: "communication-bus",
      payload: {},
    };
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-EVT002", message, retryable: false };
  }
}
