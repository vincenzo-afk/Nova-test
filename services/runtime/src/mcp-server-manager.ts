import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpServerConfiguration, McpServerLifecycleState } from "./configuration-store.js";
import type { McpServerLocalStateCleanup } from "./mcp-server-local-state-cleanup.js";

export type McpServerRecord = McpServerConfiguration;

export interface RemovedMcpServer {
  readonly server_id: string;
  readonly state: "Removed";
}

export class McpServerManager {
  private readonly servers = new Map<string, McpServerRecord>();

  public constructor(
    initial: readonly McpServerRecord[] = [],
    private readonly localStateCleanup?: Pick<McpServerLocalStateCleanup, "clear">,
  ) {
    for (const server of initial) this.servers.set(server.server_id, clone(server));
  }

  public replace(servers: readonly McpServerRecord[]): void {
    this.servers.clear();
    for (const server of servers) this.servers.set(server.server_id, clone(server));
  }

  public add(server: McpServerRecord): Result<McpServerRecord> {
    if (this.servers.has(server.server_id))
      return err(this.error("MCP server is already configured."));
    if (server.state !== "Discovered")
      return err(this.error("New MCP servers must begin in Discovered state."));
    this.servers.set(server.server_id, clone(server));
    return ok(clone(server));
  }

  public list(): readonly McpServerRecord[] {
    return [...this.servers.values()].map(clone);
  }

  public requestApproval(serverId: string, confirmed: boolean): Result<McpServerRecord> {
    if (confirmed !== true) return err(this.confirmationError("requesting MCP server approval"));
    return this.transition(serverId, "Discovered", "Pending approval");
  }

  public approve(serverId: string, confirmed: boolean): Result<McpServerRecord> {
    if (confirmed !== true)
      return err({
        code: "NOVA-SEC001",
        message: "Approving an MCP server requires explicit confirmation.",
        retryable: false,
      });
    return this.transition(serverId, "Pending approval", "Connected");
  }

  public disable(serverId: string, confirmed: boolean): Result<McpServerRecord> {
    if (confirmed !== true) return err(this.confirmationError("disabling an MCP server"));
    return this.transition(serverId, "Connected", "Disabled");
  }

  public enable(serverId: string, confirmed: boolean): Result<McpServerRecord> {
    if (confirmed !== true) return err(this.confirmationError("enabling an MCP server"));
    return this.transition(serverId, "Disabled", "Connected");
  }

  public remove(serverId: string, confirmed: boolean): Result<RemovedMcpServer> {
    if (confirmed !== true)
      return err({
        code: "NOVA-SEC001",
        message: "Removing an MCP server requires explicit confirmation.",
        retryable: false,
      });
    const server = this.servers.get(serverId);
    if (!server) return err(this.error("MCP server was not found."));
    if (this.localStateCleanup !== undefined) {
      const cleared = this.localStateCleanup.clear(serverId);
      if (!cleared.ok) return cleared;
    }
    this.servers.delete(serverId);
    return ok({ server_id: server.server_id, state: "Removed" });
  }

  private transition(
    serverId: string,
    from: McpServerLifecycleState,
    to: McpServerLifecycleState,
  ): Result<McpServerRecord> {
    const server = this.servers.get(serverId);
    if (!server) return err(this.error("MCP server was not found."));
    if (server.state !== from)
      return err(this.error(`MCP server must be ${from} before it can become ${to}.`));
    const updated = { ...server, state: to } as McpServerRecord;
    this.servers.set(serverId, updated);
    return ok(clone(updated));
  }

  private confirmationError(action: string): ErrorInfo {
    return {
      code: "NOVA-SEC001",
      message: `Explicit confirmation is required before ${action}.`,
      retryable: false,
    };
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
