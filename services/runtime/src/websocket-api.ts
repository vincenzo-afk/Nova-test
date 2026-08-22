import { createServer, type IncomingMessage, type Server } from "node:http";
import { messageEnvelopeSchema, type CommunicationBus, type MessageEnvelope } from "@nova/shared";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import type { LocalApiPrincipal, LocalApiTokenIssuer } from "./rest-api.js";

export interface WebSocketTopicAuthorizationInput {
  readonly principal: LocalApiPrincipal;
  readonly topics: readonly string[];
}

export interface WebSocketEventJournalOptions {
  readonly maxHistory?: number;
}

export interface WebSocketEventJournal {
  publish(message: MessageEnvelope): Promise<void>;
  subscribe(topic: string, handler: (message: MessageEnvelope) => Promise<void>): () => void;
  replay(input: {
    readonly topics: readonly string[];
    readonly from_message_id?: string;
    readonly from_timestamp?: string;
  }): readonly MessageEnvelope[];
}

export class CommunicationBusEventJournal implements WebSocketEventJournal {
  private readonly history: MessageEnvelope[] = [];
  private readonly maxHistory: number;

  public constructor(
    private readonly bus: CommunicationBus,
    options: WebSocketEventJournalOptions = {},
  ) {
    this.maxHistory = Math.max(1, Math.floor(options.maxHistory ?? 500));
  }

  public async publish(message: MessageEnvelope): Promise<void> {
    const parsed = messageEnvelopeSchema.safeParse(message);
    if (!parsed.success) throw new Error("WebSocket event failed message-envelope validation.");
    const result = await this.bus.publish(message);
    if (!result.ok) throw new Error(result.error.message);
    this.history.push(message);
    while (this.history.length > this.maxHistory) this.history.shift();
  }

  public subscribe(
    topic: string,
    handler: (message: MessageEnvelope) => Promise<void>,
  ): () => void {
    return this.bus.subscribe(topic, handler);
  }

  public replay(input: {
    readonly topics: readonly string[];
    readonly from_message_id?: string;
    readonly from_timestamp?: string;
  }): readonly MessageEnvelope[] {
    const topicSet = new Set(input.topics);
    let start = 0;
    if (input.from_message_id) {
      const index = this.history.findIndex(
        (message) => message.message_id === input.from_message_id,
      );
      start = index < 0 ? this.history.length : index + 1;
    } else if (input.from_timestamp) {
      const fromTimestamp = input.from_timestamp;
      start = this.history.findIndex((message) => message.timestamp > fromTimestamp);
      if (start < 0) start = this.history.length;
    }
    return this.history.slice(start).filter((message) => topicSet.has(message.topic));
  }
}

export interface PublicWebSocketServerOptions {
  readonly tokenIssuer: LocalApiTokenIssuer;
  readonly events: WebSocketEventJournal;
  readonly authorizeTopics: (input: WebSocketTopicAuthorizationInput) => boolean;
  readonly host?: string;
  readonly port?: number;
  readonly maxBufferedBytes?: number;
}

interface Session {
  readonly socket: WebSocket;
  readonly principal: LocalApiPrincipal;
  readonly subscriptions: Map<string, () => void>;
}

export class PublicWebSocketServer {
  private readonly host: string;
  private readonly port: number;
  private readonly maxBufferedBytes: number;
  private readonly webSocketServer = new WebSocketServer({ noServer: true });
  private readonly sessions = new Set<Session>();
  private server: Server | undefined;
  private boundPort: number | undefined;

  public constructor(private readonly options: PublicWebSocketServerOptions) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 0;
    this.maxBufferedBytes = Math.max(1024, Math.floor(options.maxBufferedBytes ?? 1_048_576));
  }

  public async start(): Promise<void> {
    if (this.server) return;
    this.server = createServer();
    this.server.on("upgrade", (request, socket, head) => {
      const principal = this.authenticate(request);
      if (!principal || this.path(request) !== "/v1/events") {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      this.webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        this.webSocketServer.emit("connection", webSocket, request, principal);
      });
    });
    this.webSocketServer.on(
      "connection",
      (socket: WebSocket, _request: IncomingMessage, principal: LocalApiPrincipal) => {
        this.attachSession(socket, principal);
      },
    );
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.port, this.host, () => {
        const address = this.server?.address();
        this.boundPort = typeof address === "object" && address ? address.port : this.port;
        resolve();
      });
    });
  }

  public url(): string {
    if (this.boundPort === undefined) throw new Error("WebSocket server is not started.");
    return `ws://${this.host}:${this.boundPort}/v1/events`;
  }

  public async stop(): Promise<void> {
    for (const session of [...this.sessions]) {
      this.cleanup(session);
      session.socket.close(1001, "Server shutting down.");
    }
    this.sessions.clear();
    if (this.server) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
    }
    await new Promise<void>((resolve) => this.webSocketServer.close(() => resolve()));
    this.boundPort = undefined;
  }

  private attachSession(socket: WebSocket, principal: LocalApiPrincipal): void {
    const session: Session = { socket, principal, subscriptions: new Map() };
    this.sessions.add(session);
    socket.on("message", (data: RawData) => void this.handleMessage(session, data));
    socket.once("close", () => this.cleanup(session));
    socket.once("error", () => this.cleanup(session));
  }

  private async handleMessage(session: Session, data: RawData): Promise<void> {
    let value: unknown;
    try {
      value = JSON.parse(data.toString()) as unknown;
    } catch {
      this.sendError(session.socket, "NOVA-TL003", "WebSocket command must be valid JSON.");
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      this.sendError(session.socket, "NOVA-TL003", "WebSocket command must be an object.");
      return;
    }
    const command = value as Record<string, unknown>;
    const action = command.action;
    const topics = command.topics;
    if ((action === "subscribe" || action === "unsubscribe") && !this.validTopics(topics)) {
      this.sendError(session.socket, "NOVA-TL003", "topics must be a non-empty string array.");
      return;
    }
    if (action === "subscribe") {
      const requestedTopics = topics as string[];
      if (
        !this.options.authorizeTopics({ principal: session.principal, topics: requestedTopics })
      ) {
        this.sendError(
          session.socket,
          "NOVA-SEC001",
          "The token is not authorized for one or more topics.",
        );
        return;
      }
      for (const topic of requestedTopics) {
        if (session.subscriptions.has(topic)) continue;
        const unsubscribe = this.options.events.subscribe(topic, async (message) => {
          this.sendEvent(session.socket, message);
        });
        session.subscriptions.set(topic, unsubscribe);
      }
      this.sendJson(session.socket, { action: "subscribed", topics: requestedTopics });
      return;
    }
    if (action === "unsubscribe") {
      const requestedTopics = topics as string[];
      for (const topic of requestedTopics) {
        session.subscriptions.get(topic)?.();
        session.subscriptions.delete(topic);
      }
      this.sendJson(session.socket, { action: "unsubscribed", topics: requestedTopics });
      return;
    }
    if (action === "replay") {
      const fromMessageId = command.from_message_id;
      const fromTimestamp = command.from_timestamp;
      if (
        (fromMessageId !== undefined && typeof fromMessageId !== "string") ||
        (fromTimestamp !== undefined && typeof fromTimestamp !== "string") ||
        (fromMessageId === undefined && fromTimestamp === undefined)
      ) {
        this.sendError(
          session.socket,
          "NOVA-TL003",
          "Replay requires from_message_id or from_timestamp.",
        );
        return;
      }
      const replayed = this.options.events.replay({
        topics: [...session.subscriptions.keys()],
        ...(fromMessageId === undefined ? {} : { from_message_id: fromMessageId }),
        ...(fromTimestamp === undefined ? {} : { from_timestamp: fromTimestamp }),
      });
      for (const message of replayed) this.sendEvent(session.socket, message);
      return;
    }
    this.sendError(session.socket, "NOVA-TL003", "Unsupported WebSocket action.");
  }

  private validTopics(value: unknown): value is string[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((topic) => typeof topic === "string" && topic.length > 0)
    );
  }

  private sendEvent(socket: WebSocket, message: MessageEnvelope): void {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
    if (socket.bufferedAmount > this.maxBufferedBytes) {
      this.sendError(socket, "NOVA-EVT002", "WebSocket consumer exceeded the event buffer limit.");
      socket.close(1013, "Consumer is too slow.");
    }
  }

  private sendJson(socket: WebSocket, value: unknown): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
  }

  private sendError(socket: WebSocket, code: string, message: string): void {
    this.sendJson(socket, { error: { code, message } });
  }

  private cleanup(session: Session): void {
    if (!this.sessions.delete(session)) return;
    for (const unsubscribe of session.subscriptions.values()) unsubscribe();
    session.subscriptions.clear();
  }

  private authenticate(request: IncomingMessage): LocalApiPrincipal | undefined {
    const header = request.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Bearer ")) return undefined;
    return this.options.tokenIssuer.authenticate(header.slice("Bearer ".length));
  }

  private path(request: IncomingMessage): string {
    return new URL(request.url ?? "/", `http://${this.host}`).pathname;
  }
}
