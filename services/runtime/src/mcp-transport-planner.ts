import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpServerConfiguration } from "./configuration-store.js";

export type McpTransportPlan =
  | {
      readonly transport: "stdio";
      readonly command: string;
      readonly args: readonly string[];
    }
  | {
      readonly transport: "streamable-http";
      readonly endpoint: string;
      readonly auth_reference?: string;
    };

const MAX_ARGUMENTS = 64;
const MAX_ARGUMENT_LENGTH = 256;

export class McpTransportPlanner {
  public plan(server: McpServerConfiguration): Result<McpTransportPlan> {
    if (server.transport === "stdio") {
      if (
        typeof server.command !== "string" ||
        server.command.trim() === "" ||
        server.endpoint !== undefined ||
        !isArgumentList(server.args)
      ) {
        return err(this.error("stdio MCP server configuration is invalid."));
      }
      return ok({
        transport: "stdio",
        command: server.command,
        args: [...(server.args ?? [])],
      });
    }

    if (server.transport === "streamable-http") {
      if (
        typeof server.endpoint !== "string" ||
        !isMcpEndpoint(server.endpoint) ||
        server.command !== undefined ||
        server.args !== undefined ||
        (server.auth_reference !== undefined && !isVaultReference(server.auth_reference))
      ) {
        return err(this.error("Streamable HTTP MCP server configuration is invalid."));
      }
      return ok({
        transport: "streamable-http",
        endpoint: server.endpoint,
        ...(server.auth_reference === undefined ? {} : { auth_reference: server.auth_reference }),
      });
    }

    return err(this.error("MCP server transport is unsupported."));
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isArgumentList(value: unknown): value is readonly string[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.length <= MAX_ARGUMENTS &&
      value.every(
        (argument) => typeof argument === "string" && argument.length <= MAX_ARGUMENT_LENGTH,
      ))
  );
}

function isMcpEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase());
    return (
      (url.protocol === "https:" || (url.protocol === "http:" && loopback)) &&
      url.username === "" &&
      url.password === "" &&
      url.hash === "" &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function isVaultReference(value: unknown): value is string {
  return typeof value === "string" && /^vault:\/\/[A-Za-z0-9._/-]{1,256}$/.test(value);
}
