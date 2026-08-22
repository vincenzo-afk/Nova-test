import { createHmac, randomBytes, randomUUID } from "node:crypto";

export type WebhookStatus = "healthy" | "unhealthy";

export interface WebhookRegistration {
  readonly id: string;
  readonly url: string;
  readonly topics: readonly string[];
  readonly secret: string;
  readonly status: WebhookStatus;
  readonly failure_count: number;
}

export interface WebhookEvent {
  readonly event_id?: string;
  readonly topic: string;
  readonly timestamp?: string;
  readonly payload: unknown;
}

export type WebhookHeaders = Readonly<Record<string, string>>;
export type WebhookSender = (url: string, body: string, headers: WebhookHeaders) => Promise<void>;

export interface WebhookManagerOptions {
  readonly send?: WebhookSender;
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly sleep?: (delayMs: number) => Promise<void>;
}

interface StoredRegistration {
  readonly id: string;
  readonly url: string;
  readonly topics: readonly string[];
  readonly secret: string;
  status: WebhookStatus;
  failure_count: number;
}

export class WebhookManager {
  private readonly registrations = new Map<string, StoredRegistration>();
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly send: WebhookSender;

  public constructor(options: WebhookManagerOptions) {
    this.send =
      options.send ??
      (async (url, body, headers) => {
        const response = await fetch(url, { method: "POST", headers, body });
        if (!response.ok) throw new Error(`Webhook endpoint returned HTTP ${response.status}.`);
      });
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 5);
    this.baseDelayMs = Math.max(0, options.baseDelayMs ?? 250);
    this.sleep =
      options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  }

  public register(input: {
    readonly url: string;
    readonly topics: readonly string[];
  }): WebhookRegistration {
    if (!/^https?:\/\//i.test(input.url)) throw new Error("Webhook URL must use http or https.");
    if (input.topics.length === 0) throw new Error("At least one webhook topic is required.");
    const registration: StoredRegistration = {
      id: `webhook-${randomUUID()}`,
      url: input.url,
      topics: [...new Set(input.topics)],
      secret: randomBytes(32).toString("hex"),
      status: "healthy",
      failure_count: 0,
    };
    this.registrations.set(registration.id, registration);
    return this.snapshot(registration);
  }

  public disable(id: string): void {
    const registration = this.require(id);
    registration.status = "unhealthy";
  }

  public enable(id: string): WebhookRegistration {
    const registration = this.require(id);
    registration.status = "healthy";
    registration.failure_count = 0;
    return this.snapshot(registration);
  }

  public health(id: string): WebhookRegistration {
    return this.snapshot(this.require(id));
  }

  public async publish(event: WebhookEvent): Promise<void> {
    const matching = [...this.registrations.values()].filter((registration) =>
      registration.topics.includes(event.topic),
    );
    const results = await Promise.allSettled(
      matching.map((registration) => this.deliver(registration, event)),
    );
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failed) throw failed.reason;
  }

  private async deliver(registration: StoredRegistration, event: WebhookEvent): Promise<void> {
    const unsigned = {
      event_id: event.event_id ?? randomUUID(),
      topic: event.topic,
      timestamp: event.timestamp ?? new Date().toISOString(),
      payload: event.payload,
    };
    const unsignedBody = JSON.stringify(unsigned);
    const signature = createHmac("sha256", registration.secret).update(unsignedBody).digest("hex");
    const body = JSON.stringify({ ...unsigned, signature });
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        await this.send(registration.url, body, {
          "content-type": "application/json",
          "x-nova-event-id": unsigned.event_id,
          "x-nova-signature": signature,
          "x-nova-schema-version": "1.0.0",
        });
        registration.status = "healthy";
        registration.failure_count = 0;
        return;
      } catch (cause) {
        lastError = cause;
        if (attempt < this.maxAttempts) await this.sleep(this.baseDelayMs * 2 ** (attempt - 1));
      }
    }

    registration.status = "unhealthy";
    registration.failure_count += 1;
    throw lastError instanceof Error ? lastError : new Error("Webhook delivery failed.");
  }

  private require(id: string): StoredRegistration {
    const registration = this.registrations.get(id);
    if (!registration) throw new Error(`Unknown webhook registration: ${id}`);
    return registration;
  }

  private snapshot(registration: StoredRegistration): WebhookRegistration {
    return {
      id: registration.id,
      url: registration.url,
      topics: [...registration.topics],
      secret: registration.secret,
      status: registration.status,
      failure_count: registration.failure_count,
    };
  }
}
