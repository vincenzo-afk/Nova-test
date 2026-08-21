import { randomUUID } from "node:crypto";
import {
  err,
  messageEnvelopeSchema,
  ok,
  retryPolicy,
  type ErrorInfo,
  type MessageEnvelope,
  type Result,
} from "./contracts.js";

export type MessageHandler<TPayload = unknown> = (
  message: MessageEnvelope<TPayload>,
) => Promise<void>;

export interface DeadLetter {
  readonly message: MessageEnvelope;
  readonly error: ErrorInfo;
  readonly attempts: number;
}

export interface CommunicationBus {
  subscribe<TPayload>(topic: string, handler: MessageHandler<TPayload>): () => void;
  publish<TPayload>(message: MessageEnvelope<TPayload>): Promise<Result<void>>;
  deadLetters(): readonly DeadLetter[];
}

interface Subscription {
  readonly handler: MessageHandler;
  readonly processedMessageIds: Set<string>;
}

export class InMemoryCommunicationBus implements CommunicationBus {
  private readonly subscriptions = new Map<string, Set<Subscription>>();
  private readonly deadLetterEntries: DeadLetter[] = [];
  private readonly attemptsByMessageAndSubscriber = new Map<string, number>();

  subscribe<TPayload>(topic: string, handler: MessageHandler<TPayload>): () => void {
    const subscription: Subscription = {
      handler: handler as MessageHandler,
      processedMessageIds: new Set<string>(),
    };
    const subscribers = this.subscriptions.get(topic) ?? new Set<Subscription>();
    subscribers.add(subscription);
    this.subscriptions.set(topic, subscribers);

    return () => {
      subscribers.delete(subscription);
      if (subscribers.size === 0) {
        this.subscriptions.delete(topic);
      }
    };
  }

  async publish<TPayload>(message: MessageEnvelope<TPayload>): Promise<Result<void>> {
    const parsed = messageEnvelopeSchema.safeParse(message);
    if (!parsed.success) {
      return err({
        code: "NOVA-EVT001",
        message: "Message envelope failed schema validation.",
        retryable: false,
        details: { issueCount: parsed.error.issues.length },
      });
    }

    const subscribers = this.subscriptions.get(message.topic);
    if (!subscribers || subscribers.size === 0) {
      return ok(undefined);
    }

    for (const subscriber of subscribers) {
      if (subscriber.processedMessageIds.has(message.message_id)) {
        continue;
      }

      const key = `${message.message_id}:${message.topic}`;
      const attempts = (this.attemptsByMessageAndSubscriber.get(key) ?? 0) + 1;
      this.attemptsByMessageAndSubscriber.set(key, attempts);

      try {
        await subscriber.handler(message);
        subscriber.processedMessageIds.add(message.message_id);
        this.attemptsByMessageAndSubscriber.delete(key);
      } catch (cause) {
        if (attempts >= retryPolicy.maxRetries) {
          this.deadLetterEntries.push({
            message,
            error: {
              code: "NOVA-EVT002",
              message:
                cause instanceof Error ? cause.message : "Subscriber failed processing event.",
              retryable: false,
              details: { attempts },
            },
            attempts,
          });
          this.attemptsByMessageAndSubscriber.delete(key);
          continue;
        }

        return err({
          code: "NOVA-EVT002",
          message: "Subscriber failed processing event; message may be retried.",
          retryable: true,
          details: { attempts },
        });
      }
    }

    return ok(undefined);
  }

  deadLetters(): readonly DeadLetter[] {
    return [...this.deadLetterEntries];
  }
}

export const createMessage = <TPayload>(
  input: Omit<MessageEnvelope<TPayload>, "message_id" | "timestamp">,
): MessageEnvelope<TPayload> => ({
  ...input,
  message_id: randomUUID(),
  timestamp: new Date().toISOString(),
});
