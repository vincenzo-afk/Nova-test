import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { RegisteredAction, RegisteredTool, ToolRegistry } from "./tool-registry.js";

export type McpRiskTier = RegisteredAction["risk_tier"];
export type McpVerificationSignal = RegisteredAction["verification_signal"];
export type McpCostClass = RegisteredAction["estimated_cost_class"];

export interface McpToolMetadata {
  readonly risk_tier?: McpRiskTier;
  readonly verification_signal?: McpVerificationSignal;
  readonly lockable_resources?: readonly string[];
  readonly permission_scope?: string;
  readonly estimated_latency_ms?: number;
  readonly estimated_cost_class?: McpCostClass;
  readonly timeout_ms?: number;
  readonly idempotent?: boolean;
  readonly output_schema?: Readonly<Record<string, unknown>>;
  readonly deterministic?: boolean;
  readonly dependencies?: readonly string[];
  readonly target_entity_types?: readonly string[];
}

export interface McpToolAdvertisement {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema?: Readonly<Record<string, unknown>>;
  readonly nova?: McpToolMetadata;
}

const MAX_TOOLS_PER_DISCOVERY = 128;
const MAX_TOOL_NAME_LENGTH = 128;
const MAX_SCHEMA_BYTES = 131_072;
const MAX_PERMISSION_SCOPE_LENGTH = 256;
const MAX_LOCKABLE_RESOURCES = 64;
const MAX_LOCKABLE_RESOURCE_LENGTH = 256;
const MAX_DEPENDENCIES = 64;
const MAX_DEPENDENCY_LENGTH = 256;
const MAX_TARGET_ENTITY_TYPES = 64;
const MAX_TARGET_ENTITY_TYPE_LENGTH = 256;
const MAX_LATENCY_MS = 300_000;
const MAX_TIMEOUT_MS = 300_000;
const DEFAULT_LATENCY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 30_000;

export class McpToolDiscovery {
  public constructor(private readonly registry: ToolRegistry) {}

  public register(
    serverId: string,
    advertisements: readonly McpToolAdvertisement[],
  ): Result<readonly RegisteredTool[]> {
    const validation = this.validate(serverId, advertisements);
    if (!validation.ok) return validation;

    const tools = advertisements.map((advertisement) => toRegisteredTool(serverId, advertisement));
    const duplicate = tools.find((tool) => this.registry.get(tool.tool_id).ok);
    if (duplicate) return err(this.error("An MCP tool is already registered.", duplicate.tool_id));

    const registrations: RegisteredTool[] = [];
    for (const tool of tools) {
      const result = this.registry.register(tool);
      if (!result.ok) {
        for (const registered of registrations) this.registry.deregister(registered.tool_id);
        return result;
      }
      registrations.push(result.value);
    }
    return ok(registrations);
  }

  public replace(
    serverId: string,
    advertisements: readonly McpToolAdvertisement[],
  ): Result<readonly RegisteredTool[]> {
    const validation = this.validate(serverId, advertisements);
    if (!validation.ok) return validation;

    const tools = advertisements.map((advertisement) => toRegisteredTool(serverId, advertisement));
    const query = this.registry.query({ execution_tier: "mcp" });
    if (!query.ok) return query;
    const prefix = `${serverId}.`;
    const current = query.value.filter((tool) => tool.tool_id.startsWith(prefix));
    const currentIds = new Set(current.map((tool) => tool.tool_id));
    const duplicate = tools.find(
      (tool) =>
        query.value.some((registered) => registered.tool_id === tool.tool_id) &&
        !currentIds.has(tool.tool_id),
    );
    if (duplicate) return err(this.error("An MCP tool is already registered.", duplicate.tool_id));

    for (const tool of current) {
      const result = this.registry.deregister(tool.tool_id);
      if (!result.ok) return result;
    }

    const registrations: RegisteredTool[] = [];
    for (const tool of tools) {
      const result = this.registry.register(tool);
      if (!result.ok) {
        for (const registered of registrations) this.registry.deregister(registered.tool_id);
        for (const previous of current) this.registry.register(previous);
        return result;
      }
      registrations.push(result.value);
    }
    return ok(registrations);
  }

  public deregister(serverId: string): Result<void> {
    if (!isServerId(serverId)) return err(this.error("MCP server id is invalid."));
    const prefix = `${serverId}.`;
    const query = this.registry.query({ execution_tier: "mcp" });
    if (!query.ok) return query;
    const tools = query.value.filter((tool) => tool.tool_id.startsWith(prefix));
    const deregistered: RegisteredTool[] = [];
    for (const tool of tools) {
      const result = this.registry.deregister(tool.tool_id);
      if (!result.ok) {
        for (const previous of deregistered) this.registry.register(previous);
        return result;
      }
      deregistered.push(tool);
    }
    return ok(undefined);
  }

  private validate(
    serverId: string,
    advertisements: readonly McpToolAdvertisement[],
  ): Result<void> {
    if (!isServerId(serverId)) return err(this.error("MCP server id is invalid."));
    if (!Array.isArray(advertisements) || advertisements.length > MAX_TOOLS_PER_DISCOVERY) {
      return err(this.error("MCP tool advertisement list is invalid or too large."));
    }
    const names = new Set<string>();
    for (const advertisement of advertisements) {
      if (
        !isRecord(advertisement) ||
        typeof advertisement.name !== "string" ||
        advertisement.name.trim() === "" ||
        advertisement.name.length > MAX_TOOL_NAME_LENGTH ||
        names.has(advertisement.name) ||
        !isBoundedSchema(advertisement.inputSchema) ||
        (advertisement.outputSchema !== undefined &&
          !isBoundedSchema(advertisement.outputSchema)) ||
        !isMcpToolMetadata(advertisement.nova)
      ) {
        return err(this.error("MCP tool advertisement is malformed."));
      }
      names.add(advertisement.name);
    }
    return ok(undefined);
  }

  private error(message: string, toolId?: string): ErrorInfo {
    return {
      code: "NOVA-TL002",
      message,
      retryable: false,
      ...(toolId === undefined ? {} : { details: { toolId } }),
    };
  }
}

function toRegisteredTool(serverId: string, advertisement: McpToolAdvertisement): RegisteredTool {
  const metadata = advertisement.nova;
  return {
    tool_id: `${serverId}.${advertisement.name}`,
    execution_tier: "mcp",
    deterministic: metadata?.deterministic ?? true,
    dependencies: [...(metadata?.dependencies ?? [])],
    target_entity_types: [...(metadata?.target_entity_types ?? [])],
    supported_actions: [
      {
        action_id: "invoke",
        risk_tier: metadata?.risk_tier ?? "destructive_irreversible",
        verification_signal: metadata?.verification_signal ?? "none",
        lockable_resources: [...(metadata?.lockable_resources ?? [])],
        permission_scope: metadata?.permission_scope ?? `mcp:${serverId}`,
        estimated_latency_ms: metadata?.estimated_latency_ms ?? DEFAULT_LATENCY_MS,
        estimated_cost_class: metadata?.estimated_cost_class ?? "low",
        timeout_ms: metadata?.timeout_ms ?? DEFAULT_TIMEOUT_MS,
        idempotent: metadata?.idempotent ?? false,
        input_schema: clone(advertisement.inputSchema),
        output_schema: clone(
          advertisement.outputSchema ?? metadata?.output_schema ?? { type: "object" },
        ),
      },
    ],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isBoundedSchema(value: unknown): value is Readonly<Record<string, unknown>> {
  if (!isRecord(value)) return false;
  try {
    const serialized = JSON.stringify(value);
    return serialized !== undefined && serialized.length <= MAX_SCHEMA_BYTES;
  } catch {
    return false;
  }
}

function isServerId(value: string): boolean {
  return /^[A-Za-z0-9_.-]{1,128}$/.test(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMcpToolMetadata(value: unknown): value is McpToolMetadata | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  if (
    value.risk_tier !== undefined &&
    !["read_only", "reversible_write", "destructive_irreversible"].includes(String(value.risk_tier))
  )
    return false;
  if (
    value.verification_signal !== undefined &&
    !["exit_code", "api_response", "file_hash", "accessibility_state", "none"].includes(
      String(value.verification_signal),
    )
  )
    return false;
  if (
    value.permission_scope !== undefined &&
    !isNonEmptyBoundedString(value.permission_scope, MAX_PERMISSION_SCOPE_LENGTH)
  )
    return false;
  if (value.output_schema !== undefined && !isBoundedSchema(value.output_schema)) return false;
  if (
    value.estimated_latency_ms !== undefined &&
    !isBoundedNonnegativeInteger(value.estimated_latency_ms, MAX_LATENCY_MS)
  )
    return false;
  if (value.timeout_ms !== undefined && !isBoundedPositiveInteger(value.timeout_ms, MAX_TIMEOUT_MS))
    return false;
  if (
    value.estimated_cost_class !== undefined &&
    !["free", "low", "medium", "high"].includes(String(value.estimated_cost_class))
  )
    return false;
  if (value.idempotent !== undefined && typeof value.idempotent !== "boolean") return false;
  if (value.deterministic !== undefined && typeof value.deterministic !== "boolean") return false;
  if (value.output_schema !== undefined && !isRecord(value.output_schema)) return false;
  if (
    value.lockable_resources !== undefined &&
    !isBoundedStringArray(
      value.lockable_resources,
      MAX_LOCKABLE_RESOURCES,
      MAX_LOCKABLE_RESOURCE_LENGTH,
    )
  )
    return false;
  if (
    value.dependencies !== undefined &&
    !isBoundedStringArray(value.dependencies, MAX_DEPENDENCIES, MAX_DEPENDENCY_LENGTH)
  )
    return false;
  if (
    value.target_entity_types !== undefined &&
    !isBoundedStringArray(
      value.target_entity_types,
      MAX_TARGET_ENTITY_TYPES,
      MAX_TARGET_ENTITY_TYPE_LENGTH,
    )
  )
    return false;
  return true;
}

function isBoundedStringArray(
  value: unknown,
  maxItems: number,
  maxItemLength: number,
): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === "string" && item.length <= maxItemLength)
  );
}

function isBoundedNonnegativeInteger(value: unknown, maxValue: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maxValue;
}

function isNonEmptyBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isBoundedPositiveInteger(value: unknown, maxValue: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= maxValue;
}
