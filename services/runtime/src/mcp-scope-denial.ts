import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpScopeDenial {
  readonly server_id: string;
  readonly tool_name: string;
  readonly status: "capability-unavailable";
  readonly action: "reauthorize";
  readonly missing_scopes: readonly string[];
  readonly retryable: false;
}

const MAX_SCOPES = 32;
const MAX_SCOPE_LENGTH = 128;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const SCOPE_PATTERN = /^[A-Za-z0-9:._/-]{1,128}$/;

export class McpScopeDenialNormalizer {
  public normalize(
    serverId: string,
    toolName: string,
    missingScopes: readonly string[],
  ): Result<McpScopeDenial> {
    if (
      !IDENTIFIER_PATTERN.test(serverId) ||
      !IDENTIFIER_PATTERN.test(toolName) ||
      !isScopeList(missingScopes)
    ) {
      return err(this.error("MCP authorization-denial metadata is invalid."));
    }
    return ok({
      server_id: serverId,
      tool_name: toolName,
      status: "capability-unavailable",
      action: "reauthorize",
      missing_scopes: [...missingScopes],
      retryable: false,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isScopeList(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SCOPES) return false;
  const seen = new Set<string>();
  for (const scope of value) {
    if (
      typeof scope !== "string" ||
      scope.length > MAX_SCOPE_LENGTH ||
      !SCOPE_PATTERN.test(scope) ||
      seen.has(scope)
    ) {
      return false;
    }
    seen.add(scope);
  }
  return true;
}
