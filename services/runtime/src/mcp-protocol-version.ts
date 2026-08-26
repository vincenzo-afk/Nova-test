import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

const MAX_SUPPORTED_VERSIONS = 64;
const VERSION_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class McpProtocolVersionNegotiator {
  public select(
    clientSupported: readonly string[],
    serverSupported: readonly string[],
  ): Result<string> {
    if (!isVersionList(clientSupported) || !isVersionList(serverSupported)) {
      return err(this.error("MCP protocol version list is malformed."));
    }
    const serverVersions = new Set(serverSupported);
    const common = clientSupported.filter((version) => serverVersions.has(version));
    if (common.length === 0) {
      return err(this.error("No mutually supported MCP protocol version exists."));
    }
    return ok([...common].sort().at(-1) as string);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function isVersionList(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SUPPORTED_VERSIONS) {
    return false;
  }
  const versions = new Set<string>();
  for (const version of value) {
    if (!isProtocolVersion(version) || versions.has(version)) return false;
    versions.add(version);
  }
  return true;
}

function isProtocolVersion(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = VERSION_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
