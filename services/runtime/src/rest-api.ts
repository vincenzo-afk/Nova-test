import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export type ApiScope =
  | "memory.read"
  | "memory.write"
  | "files.read"
  | "files.write"
  | "tools.invoke:read_only"
  | "tools.invoke:reversible_write"
  | "tools.invoke:destructive_irreversible"
  | "task.submit"
  | "task.cancel"
  | "config.read"
  | "config.write"
  | "network.external";

export interface LocalApiPrincipal {
  readonly token: string;
  readonly scopes: readonly ApiScope[];
}

export class LocalApiTokenIssuer {
  private readonly principals = new Map<string, LocalApiPrincipal>();

  public issue(scopes: readonly ApiScope[]): string {
    const token = `nova_${randomUUID().replaceAll("-", "")}`;
    this.principals.set(token, { token, scopes: [...new Set(scopes)] });
    return token;
  }

  public authenticate(token: string): LocalApiPrincipal | undefined {
    return this.principals.get(token);
  }

  public revoke(token: string): void {
    this.principals.delete(token);
  }

  public clear(): void {
    this.principals.clear();
  }
}

export interface TaskSubmissionInput {
  readonly goal: string;
  readonly context_hint?: string;
  readonly priority: "interactive" | "background";
}

export interface PublicApiHandlers {
  readonly submitTask: (input: TaskSubmissionInput, correlationId: string) => Promise<unknown>;
}

export interface PublicApiServerOptions {
  readonly tokenIssuer: LocalApiTokenIssuer;
  readonly handlers: PublicApiHandlers;
  readonly host?: string;
  readonly port?: number;
  readonly rateLimitPerMinute?: number;
}

interface RateWindow {
  startedAt: number;
  count: number;
}

export class PublicApiServer {
  private readonly host: string;
  private readonly port: number;
  private readonly rateLimitPerMinute: number;
  private readonly rateWindows = new Map<string, RateWindow>();
  private server: Server | undefined;
  private boundPort: number | undefined;

  public constructor(private readonly options: PublicApiServerOptions) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 0;
    this.rateLimitPerMinute = options.rateLimitPerMinute ?? 60;
  }

  public async start(): Promise<void> {
    if (this.server) return;
    this.server = createServer((request, response) => {
      void this.handle(request, response);
    });
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
    if (this.boundPort === undefined) throw new Error("Public API server is not started.");
    return `http://${this.host}:${this.boundPort}`;
  }

  public async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
    this.server = undefined;
    this.boundPort = undefined;
    this.rateWindows.clear();
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-nova-schema-version", "1.0.0");
    if (request.method !== "POST" || request.url !== "/v1/tasks") {
      this.send(response, 404, { error: { code: "NOVA-TL003", message: "Endpoint not found." } });
      return;
    }

    const principal = this.authenticate(request.headers.authorization);
    if (!principal) {
      this.send(response, 401, {
        error: { code: "NOVA-SEC001", message: "A valid local bearer token is required." },
      });
      return;
    }
    if (!principal.scopes.includes("task.submit")) {
      this.send(response, 403, {
        error: { code: "NOVA-SEC001", message: "The token lacks the task.submit scope." },
      });
      return;
    }
    if (!this.allowRequest(principal.token)) {
      response.setHeader("retry-after", "60");
      this.send(response, 429, {
        error: { code: "NOVA-EVT001", message: "API rate limit exceeded." },
      });
      return;
    }

    const correlationId = this.correlationId(request.headers["x-correlation-id"]);
    if (!correlationId) {
      this.send(response, 400, {
        error: { code: "NOVA-TL003", message: "x-correlation-id must be a UUID when supplied." },
      });
      return;
    }
    try {
      const input = await this.readTaskInput(request);
      const result = await this.options.handlers.submitTask(input, correlationId);
      response.setHeader("x-correlation-id", correlationId);
      this.send(response, 202, result);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Task request failed.";
      this.send(response, 400, { error: { code: "NOVA-TL003", message } });
    }
  }

  private authenticate(header: string | undefined): LocalApiPrincipal | undefined {
    if (!header?.startsWith("Bearer ")) return undefined;
    const token = header.slice("Bearer ".length).trim();
    return token ? this.options.tokenIssuer.authenticate(token) : undefined;
  }

  private allowRequest(token: string): boolean {
    const now = Date.now();
    const current = this.rateWindows.get(token);
    if (!current || now - current.startedAt >= 60_000) {
      this.rateWindows.set(token, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= this.rateLimitPerMinute) return false;
    current.count += 1;
    return true;
  }

  private correlationId(value: string | string[] | undefined): string | undefined {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (candidate === undefined) return randomUUID();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
      ? candidate
      : undefined;
  }

  private async readTaskInput(request: IncomingMessage): Promise<TaskSubmissionInput> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > 1_000_000) throw new Error("Request body exceeds the 1 MB limit.");
      chunks.push(buffer);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object") throw new Error("Request body must be a JSON object.");
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.goal !== "string" || candidate.goal.trim().length === 0)
      throw new Error("goal must be a non-empty string.");
    if (candidate.context_hint !== undefined && typeof candidate.context_hint !== "string")
      throw new Error("context_hint must be a string.");
    if (
      candidate.priority !== undefined &&
      candidate.priority !== "interactive" &&
      candidate.priority !== "background"
    )
      throw new Error("priority must be interactive or background.");
    return {
      goal: candidate.goal,
      ...(typeof candidate.context_hint === "string"
        ? { context_hint: candidate.context_hint }
        : {}),
      priority: candidate.priority === "background" ? "background" : "interactive",
    };
  }

  private send(response: ServerResponse, status: number, body: unknown): void {
    response.statusCode = status;
    response.end(JSON.stringify(body));
  }
}
