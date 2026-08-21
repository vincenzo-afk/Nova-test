import {
  createMessage,
  type CommunicationBus,
  type ErrorInfo,
  type MessageEnvelope,
} from "@nova/shared";

interface InternalRequest {
  readonly operation: string;
  readonly request_id: string;
  readonly reply_to: string;
  readonly data: unknown;
}

type GatewayHandler = (data: unknown) => Promise<unknown>;

export class ApiGateway {
  private readonly handlers = new Map<string, GatewayHandler>();
  private unsubscribe: (() => void) | undefined;

  public constructor(private readonly bus: CommunicationBus) {}

  public register(operation: string, handler: GatewayHandler): void {
    this.handlers.set(operation, handler);
  }

  public async start(): Promise<void> {
    if (this.unsubscribe) return;
    this.unsubscribe = this.bus.subscribe("api.internal.request", async (message) => {
      await this.handle(message);
    });
  }

  public async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private async handle(message: MessageEnvelope): Promise<void> {
    const request = this.parseRequest(message.payload);
    if (!request.ok) return this.publishError(message, "", request.error);
    const handler = this.handlers.get(request.value.operation);
    if (!handler) {
      return this.publishError(message, request.value.request_id, {
        code: "NOVA-TL004",
        message: `Unknown internal API operation: ${request.value.operation}.`,
        retryable: false,
      });
    }
    try {
      const data = await handler(request.value.data);
      await this.bus.publish(
        createMessage({
          topic: request.value.reply_to,
          schema_version: "1.0.0",
          correlation_id: message.correlation_id,
          source_service: "api.gateway",
          payload: { request_id: request.value.request_id, ok: true, data },
        }),
      );
    } catch (cause) {
      await this.publishError(message, request.value.request_id, {
        code: "NOVA-TL002",
        message: cause instanceof Error ? cause.message : "Internal API operation failed.",
        retryable: true,
      });
    }
  }

  private async publishError(
    message: MessageEnvelope,
    requestId: string,
    error: ErrorInfo,
  ): Promise<void> {
    const payload = message.payload as Partial<InternalRequest>;
    if (typeof payload.reply_to !== "string") return;
    await this.bus.publish(
      createMessage({
        topic: payload.reply_to,
        schema_version: "1.0.0",
        correlation_id: message.correlation_id,
        source_service: "api.gateway",
        payload: { request_id: requestId, ok: false, error },
      }),
    );
  }

  private parseRequest(
    payload: unknown,
  ):
    | { readonly ok: true; readonly value: InternalRequest }
    | { readonly ok: false; readonly error: ErrorInfo } {
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        error: {
          code: "NOVA-TL003",
          message: "Internal API payload must be an object.",
          retryable: false,
        },
      };
    }
    const candidate = payload as Record<string, unknown>;
    if (
      typeof candidate.operation !== "string" ||
      typeof candidate.request_id !== "string" ||
      typeof candidate.reply_to !== "string"
    ) {
      return {
        ok: false,
        error: {
          code: "NOVA-TL003",
          message: "Internal API request is missing required routing fields.",
          retryable: false,
        },
      };
    }
    return {
      ok: true,
      value: {
        operation: candidate.operation,
        request_id: candidate.request_id,
        reply_to: candidate.reply_to,
        data: candidate.data,
      },
    };
  }
}
