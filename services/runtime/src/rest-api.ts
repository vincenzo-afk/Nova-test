import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export type ApiScope =
  | "memory.read"
  | "memory.write"
  | "tools.read"
  | "tools.register"
  | "files.read"
  | "files.write"
  | "tools.invoke:read_only"
  | "tools.invoke:reversible_write"
  | "tools.invoke:destructive_irreversible"
  | "task.submit"
  | "task.read"
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

export interface TaskListQuery {
  readonly cursor?: string;
  readonly limit: number;
}

export interface SearchInput {
  readonly query: string;
  readonly filters?: {
    readonly project?: string;
    readonly time_range?: { readonly start: string; readonly end: string };
    readonly entity_type?: string;
  };
}
export interface GraphQueryInput {
  readonly node_id: string;
  readonly direction: "in" | "out" | "both";
  readonly edge_type?: string;
  readonly depth: number;
}
export interface PermissionGrant {
  readonly source: string;
  readonly granted: boolean;
}
export interface PermissionPatch {
  readonly granted: boolean;
}
export type ConfigurationSection =
  | "capabilities"
  | "devices"
  | "channels"
  | "plugins"
  | "mcp_servers"
  | "routing_policies"
  | "permissions"
  | "voice"
  | "personalization";
export interface ConfigurationUpdateInput {
  readonly section: ConfigurationSection;
  readonly value: unknown;
}

export interface PublicApiHandlers {
  readonly submitTask: (input: TaskSubmissionInput, correlationId: string) => Promise<unknown>;
  readonly getTask?: (taskId: string, correlationId: string) => Promise<unknown | undefined>;
  readonly listTasks?: (query: TaskListQuery, correlationId: string) => Promise<readonly unknown[]>;
  readonly cancelTask?: (taskId: string, correlationId: string) => Promise<unknown | undefined>;
  readonly search?: (input: SearchInput, correlationId: string) => Promise<unknown>;
  readonly getMemoryRecord?: (
    recordId: string,
    correlationId: string,
  ) => Promise<unknown | undefined>;
  readonly queryGraph?: (
    input: GraphQueryInput,
    correlationId: string,
  ) => Promise<unknown | undefined>;
  readonly listPermissions?: (correlationId: string) => Promise<readonly PermissionGrant[]>;
  readonly updatePermission?: (
    grantId: string,
    patch: PermissionPatch,
    correlationId: string,
  ) => Promise<PermissionGrant | undefined>;
  readonly getConfig?: (correlationId: string) => Promise<unknown>;
  readonly updateConfig?: (
    input: ConfigurationUpdateInput,
    correlationId: string,
  ) => Promise<unknown>;
  readonly listTools?: (query: TaskListQuery, correlationId: string) => Promise<readonly unknown[]>;
  readonly registerTool?: (
    tool: Record<string, unknown>,
    correlationId: string,
  ) => Promise<unknown>;
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
  private readonly submittedTasks = new Map<string, unknown>();
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
    const url = new URL(request.url ?? "/", `http://${this.host}`);
    const correlationId = this.correlationId(request.headers["x-correlation-id"]);
    if (!correlationId) {
      this.send(response, 400, {
        error: { code: "NOVA-TL003", message: "x-correlation-id must be a UUID when supplied." },
      });
      return;
    }
    const principal = this.authenticate(request.headers.authorization);
    if (!principal) {
      this.send(response, 401, {
        error: { code: "NOVA-SEC001", message: "A valid local bearer token is required." },
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

    if (request.method === "POST" && url.pathname === "/v1/search") {
      if (!this.requireScope(principal, "memory.read", response)) return;
      if (!this.options.handlers.search) {
        this.send(response, 501, {
          error: { code: "NOVA-TL004", message: "Search handler is not configured." },
        });
        return;
      }
      try {
        const input = await this.readSearchInput(request);
        const result = await this.options.handlers.search(input, correlationId);
        response.setHeader("x-correlation-id", correlationId);
        this.send(response, 200, result);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Search request failed.";
        this.send(response, 400, { error: { code: "NOVA-TL003", message } });
      }
      return;
    }

    const memoryRecordMatch = url.pathname.match(/^\/v1\/memory\/([^/]+)$/);
    if (request.method === "GET" && memoryRecordMatch?.[1]) {
      if (!this.requireScope(principal, "memory.read", response)) return;
      if (!this.options.handlers.getMemoryRecord) {
        this.send(response, 501, {
          error: { code: "NOVA-TL004", message: "Memory-record handler is not configured." },
        });
        return;
      }
      const recordId = decodeURIComponent(memoryRecordMatch[1]);
      const result = await this.options.handlers.getMemoryRecord(recordId, correlationId);
      if (result === undefined) {
        this.send(response, 404, {
          error: { code: "NOVA-MEM003", message: "Memory record not found." },
        });
      } else {
        response.setHeader("x-correlation-id", correlationId);
        this.send(response, 200, result);
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/graph/query") {
      if (!this.requireScope(principal, "memory.read", response)) return;
      if (!this.options.handlers.queryGraph) {
        this.send(response, 501, {
          error: { code: "NOVA-TL004", message: "Graph-query handler is not configured." },
        });
        return;
      }
      try {
        const input = await this.readGraphQueryInput(request);
        const result = await this.options.handlers.queryGraph(input, correlationId);
        if (result === undefined) {
          this.send(response, 404, {
            error: { code: "NOVA-MEM003", message: "Graph node does not exist." },
          });
        } else {
          response.setHeader("x-correlation-id", correlationId);
          this.send(response, 200, result);
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Graph query failed.";
        this.send(response, 400, { error: { code: "NOVA-TL003", message } });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/config") {
      if (!this.requireScope(principal, "config.read", response)) return;
      if (!this.options.handlers.getConfig) {
        this.send(response, 501, {
          error: { code: "NOVA-CFG001", message: "Configuration-read handler is not configured." },
        });
        return;
      }
      const result = await this.options.handlers.getConfig(correlationId);
      response.setHeader("x-correlation-id", correlationId);
      this.send(response, 200, result);
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/v1/config") {
      if (!this.requireScope(principal, "config.write", response)) return;
      if (!this.options.handlers.updateConfig) {
        this.send(response, 501, {
          error: {
            code: "NOVA-CFG001",
            message: "Configuration-update handler is not configured.",
          },
        });
        return;
      }
      try {
        const input = await this.readConfigurationUpdate(request);
        const result = await this.options.handlers.updateConfig(input, correlationId);
        response.setHeader("x-correlation-id", correlationId);
        this.send(response, 200, result);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Configuration update failed.";
        this.send(response, 400, { error: { code: "NOVA-CFG001", message } });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/permissions") {
      if (!this.requireScope(principal, "config.read", response)) return;
      if (!this.options.handlers.listPermissions) {
        this.send(response, 501, {
          error: { code: "NOVA-CFG001", message: "Permission-list handler is not configured." },
        });
        return;
      }
      const result = await this.options.handlers.listPermissions(correlationId);
      response.setHeader("x-correlation-id", correlationId);
      this.send(response, 200, result);
      return;
    }

    const permissionMatch = url.pathname.match(/^\/v1\/permissions\/([^/]+)$/);
    if (request.method === "PATCH" && permissionMatch?.[1]) {
      if (!this.requireScope(principal, "config.write", response)) return;
      if (!this.options.handlers.updatePermission) {
        this.send(response, 501, {
          error: { code: "NOVA-CFG001", message: "Permission-update handler is not configured." },
        });
        return;
      }
      try {
        const patch = await this.readPermissionPatch(request);
        const grantId = decodeURIComponent(permissionMatch[1]);
        const result = await this.options.handlers.updatePermission(grantId, patch, correlationId);
        if (result === undefined) {
          this.send(response, 404, {
            error: { code: "NOVA-CFG001", message: "Permission grant not found." },
          });
        } else {
          response.setHeader("x-correlation-id", correlationId);
          this.send(response, 200, result);
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Permission update failed.";
        this.send(response, 400, { error: { code: "NOVA-CFG001", message } });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/tools") {
      if (!this.requireScope(principal, "tools.read", response)) return;
      if (!this.options.handlers.listTools) {
        this.send(response, 501, {
          error: { code: "NOVA-TL004", message: "Tool-list handler is not configured." },
        });
        return;
      }
      await this.listTools(url, correlationId, response);
      return;
    }
    if (request.method === "POST" && url.pathname === "/v1/tools/register") {
      if (!this.requireScope(principal, "tools.register", response)) return;
      if (!this.options.handlers.registerTool) {
        this.send(response, 501, {
          error: { code: "NOVA-TL004", message: "Tool-registration handler is not configured." },
        });
        return;
      }
      try {
        const value = await this.readJsonBody(request);
        if (!value || typeof value !== "object" || Array.isArray(value))
          throw new Error("Tool registration must be a JSON object.");
        const result = await this.options.handlers.registerTool(
          value as Record<string, unknown>,
          correlationId,
        );
        response.setHeader("x-correlation-id", correlationId);
        this.send(response, 201, result);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Tool registration failed.";
        this.send(response, 400, { error: { code: "NOVA-TL002", message } });
      }
      return;
    }

    const taskMatch = url.pathname.match(/^\/v1\/tasks\/([^/]+)(?:\/cancel)?$/);
    const taskId = taskMatch?.[1] ? decodeURIComponent(taskMatch[1]) : undefined;
    const isCancel = taskId !== undefined && url.pathname.endsWith("/cancel");
    if (request.method === "POST" && url.pathname === "/v1/tasks") {
      if (!this.requireScope(principal, "task.submit", response)) return;
      try {
        const input = await this.readTaskInput(request);
        const result = await this.options.handlers.submitTask(input, correlationId);
        this.rememberTask(result);
        response.setHeader("x-correlation-id", correlationId);
        this.send(response, 202, result);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Task request failed.";
        this.send(response, 400, { error: { code: "NOVA-TL003", message } });
      }
      return;
    }
    if (request.method === "GET" && url.pathname === "/v1/tasks") {
      if (!this.requireScope(principal, "task.read", response)) return;
      await this.listTasks(url, correlationId, response);
      return;
    }
    if (request.method === "GET" && taskId !== undefined && !isCancel) {
      if (!this.requireScope(principal, "task.read", response)) return;
      const result = this.options.handlers.getTask
        ? await this.options.handlers.getTask(taskId, correlationId)
        : this.submittedTasks.get(taskId);
      if (result === undefined) {
        this.send(response, 404, { error: { code: "NOVA-TL004", message: "Task not found." } });
      } else {
        response.setHeader("x-correlation-id", correlationId);
        this.send(response, 200, result);
      }
      return;
    }
    if (request.method === "POST" && taskId !== undefined && isCancel) {
      if (!this.requireScope(principal, "task.cancel", response)) return;
      const result = this.options.handlers.cancelTask
        ? await this.options.handlers.cancelTask(taskId, correlationId)
        : this.cancelRememberedTask(taskId);
      if (result === undefined) {
        this.send(response, 404, { error: { code: "NOVA-TL004", message: "Task not found." } });
      } else {
        this.rememberTask(result);
        response.setHeader("x-correlation-id", correlationId);
        this.send(response, 202, result);
      }
      return;
    }
    this.send(response, 404, { error: { code: "NOVA-TL003", message: "Endpoint not found." } });
  }

  private requireScope(
    principal: LocalApiPrincipal,
    scope: ApiScope,
    response: ServerResponse,
  ): boolean {
    if (principal.scopes.includes(scope)) return true;
    this.send(response, 403, {
      error: { code: "NOVA-SEC001", message: `The token lacks the ${scope} scope.` },
    });
    return false;
  }

  private rememberTask(result: unknown): void {
    if (!result || typeof result !== "object") return;
    const taskId = (result as Record<string, unknown>).task_id;
    if (typeof taskId === "string" && taskId.length > 0) this.submittedTasks.set(taskId, result);
  }

  private cancelRememberedTask(taskId: string): unknown | undefined {
    const task = this.submittedTasks.get(taskId);
    if (!task || typeof task !== "object") return undefined;
    const cancelled = { ...(task as Record<string, unknown>), state: "cancelled" };
    this.submittedTasks.set(taskId, cancelled);
    return cancelled;
  }

  private async listTools(
    url: URL,
    correlationId: string,
    response: ServerResponse,
  ): Promise<void> {
    const limitValue = Number(url.searchParams.get("limit") ?? "50");
    const limit =
      Number.isFinite(limitValue) && limitValue > 0 ? Math.min(200, Math.floor(limitValue)) : 50;
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const offset = this.decodeCursor(cursor);
    if (offset === undefined) {
      this.send(response, 400, { error: { code: "NOVA-TL003", message: "cursor is invalid." } });
      return;
    }
    const handler = this.options.handlers.listTools;
    if (!handler) {
      this.send(response, 501, {
        error: { code: "NOVA-TL004", message: "Tool-list handler is not configured." },
      });
      return;
    }
    const items = await handler(
      cursor === undefined ? { limit } : { cursor, limit },
      correlationId,
    );
    const page = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;
    response.setHeader("x-correlation-id", correlationId);
    this.send(response, 200, {
      items: page,
      next_cursor: hasMore ? this.encodeCursor(offset + limit) : null,
      has_more: hasMore,
    });
  }

  private async listTasks(
    url: URL,
    correlationId: string,
    response: ServerResponse,
  ): Promise<void> {
    const limitValue = Number(url.searchParams.get("limit") ?? "50");
    const limit =
      Number.isFinite(limitValue) && limitValue > 0 ? Math.min(200, Math.floor(limitValue)) : 50;
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const offset = this.decodeCursor(cursor);
    if (offset === undefined) {
      this.send(response, 400, { error: { code: "NOVA-TL003", message: "cursor is invalid." } });
      return;
    }
    const items = this.options.handlers.listTasks
      ? await this.options.handlers.listTasks(
          cursor === undefined ? { limit } : { cursor, limit },
          correlationId,
        )
      : [...this.submittedTasks.values()];
    const page = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;
    response.setHeader("x-correlation-id", correlationId);
    this.send(response, 200, {
      items: page,
      next_cursor: hasMore ? this.encodeCursor(offset + limit) : null,
      has_more: hasMore,
    });
  }

  private encodeCursor(offset: number): string {
    return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
  }

  private decodeCursor(cursor: string | undefined): number | undefined {
    if (cursor === undefined) return 0;
    try {
      const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (!parsed || typeof parsed !== "object") return undefined;
      const offset = (parsed as Record<string, unknown>).offset;
      return typeof offset === "number" && Number.isInteger(offset) && offset >= 0
        ? offset
        : undefined;
    } catch {
      return undefined;
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

  private async readConfigurationUpdate(
    request: IncomingMessage,
  ): Promise<ConfigurationUpdateInput> {
    const value = await this.readJsonBody(request);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Configuration patch must contain section and value.");
    }
    const body = value as Record<string, unknown>;
    const section = body.section;
    if (
      section !== "capabilities" &&
      section !== "devices" &&
      section !== "channels" &&
      section !== "plugins" &&
      section !== "mcp_servers" &&
      section !== "routing_policies" &&
      section !== "permissions" &&
      section !== "voice" &&
      section !== "personalization"
    ) {
      throw new Error("Configuration section is invalid.");
    }
    if (!("value" in body)) {
      throw new Error("Configuration patch must contain section and value.");
    }
    return { section, value: body.value };
  }

  private async readPermissionPatch(request: IncomingMessage): Promise<PermissionPatch> {
    const value = await this.readJsonBody(request);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Permission patch must contain a boolean granted field.");
    }
    const granted = (value as Record<string, unknown>).granted;
    if (typeof granted !== "boolean") {
      throw new Error("Permission patch must contain a boolean granted field.");
    }
    return { granted };
  }

  private async readGraphQueryInput(request: IncomingMessage): Promise<GraphQueryInput> {
    const value = await this.readJsonBody(request);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Graph query body must be a JSON object.");
    }
    const body = value as Record<string, unknown>;
    const nodeId = body.node_id;
    const direction = body.direction ?? "both";
    const edgeType = body.edge_type;
    const depth = body.depth ?? 1;
    if (typeof nodeId !== "string" || nodeId.length === 0) {
      throw new Error("Graph query node_id must be a non-empty string.");
    }
    if (direction !== "in" && direction !== "out" && direction !== "both") {
      throw new Error(
        "Graph query direction must be in, out, or both; depth must be an integer from 1 to 3.",
      );
    }
    if (edgeType !== undefined && (typeof edgeType !== "string" || edgeType.length === 0)) {
      throw new Error("Graph query edge_type must be a non-empty string when supplied.");
    }
    if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 1 || depth > 3) {
      throw new Error(
        "Graph query direction must be in, out, or both; depth must be an integer from 1 to 3.",
      );
    }
    return {
      node_id: nodeId,
      direction,
      ...(edgeType === undefined ? {} : { edge_type: edgeType }),
      depth,
    };
  }

  private async readSearchInput(request: IncomingMessage): Promise<SearchInput> {
    const value = await this.readJsonBody(request);
    if (!value || typeof value !== "object") throw new Error("Request body must be a JSON object.");
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.query !== "string" || candidate.query.trim().length === 0)
      throw new Error("query must be a non-empty string.");
    if (candidate.filters === undefined) return { query: candidate.query };
    if (!candidate.filters || typeof candidate.filters !== "object")
      throw new Error("filters must be an object.");
    const filters = candidate.filters as Record<string, unknown>;
    if (filters.project !== undefined && typeof filters.project !== "string")
      throw new Error("filters.project must be a string.");
    if (filters.entity_type !== undefined && typeof filters.entity_type !== "string")
      throw new Error("filters.entity_type must be a string.");
    let timeRange: { readonly start: string; readonly end: string } | undefined;
    if (filters.time_range !== undefined) {
      if (!filters.time_range || typeof filters.time_range !== "object")
        throw new Error("filters.time_range must be an object.");
      const range = filters.time_range as Record<string, unknown>;
      if (typeof range.start !== "string" || typeof range.end !== "string")
        throw new Error("filters.time_range requires start and end strings.");
      if (Number.isNaN(Date.parse(range.start)) || Number.isNaN(Date.parse(range.end)))
        throw new Error("filters.time_range values must be ISO 8601 timestamps.");
      timeRange = { start: range.start, end: range.end };
    }
    return {
      query: candidate.query,
      filters: {
        ...(typeof filters.project === "string" ? { project: filters.project } : {}),
        ...(timeRange ? { time_range: timeRange } : {}),
        ...(typeof filters.entity_type === "string" ? { entity_type: filters.entity_type } : {}),
      },
    };
  }

  private async readTaskInput(request: IncomingMessage): Promise<TaskSubmissionInput> {
    const value = await this.readJsonBody(request);
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

  private async readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > 1_000_000) throw new Error("Request body exceeds the 1 MB limit.");
      chunks.push(buffer);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  private send(response: ServerResponse, status: number, body: unknown): void {
    response.statusCode = status;
    response.end(JSON.stringify(body));
  }
}
