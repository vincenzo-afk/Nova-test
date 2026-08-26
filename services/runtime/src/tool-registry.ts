import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import { z } from "zod";

export interface RegisteredAction {
  readonly action_id: string;
  readonly risk_tier: "read_only" | "reversible_write" | "destructive_irreversible";
  readonly verification_signal:
    "exit_code" | "api_response" | "file_hash" | "accessibility_state" | "none";
  readonly lockable_resources: readonly string[];
  readonly permission_scope: string;
  readonly estimated_latency_ms: number;
  readonly estimated_cost_class: "free" | "low" | "medium" | "high";
  readonly timeout_ms: number;
  readonly idempotent: boolean;
  readonly compensation_action_id?: string;
  readonly input_schema: Readonly<Record<string, unknown>>;
  readonly output_schema: Readonly<Record<string, unknown>>;
}

export interface RegisteredTool {
  readonly tool_id: string;
  readonly execution_tier:
    | "native_runtime"
    | "internal_function"
    | "api"
    | "mcp"
    | "cli"
    | "accessibility"
    | "vision"
    | "keyboard_mouse";
  readonly deterministic: boolean;
  readonly dependencies: readonly string[];
  readonly target_entity_types: readonly string[];
  readonly supported_actions: readonly RegisteredAction[];
}

export interface RegisteredToolSummary {
  readonly tool_id: string;
  readonly execution_tier: RegisteredTool["execution_tier"];
  readonly deterministic: boolean;
  readonly action_count: number;
  readonly read_only_action_count: number;
  readonly compensation_action_count: number;
}

const actionSchema = z.object({
  action_id: z.string().min(1),
  risk_tier: z.enum(["read_only", "reversible_write", "destructive_irreversible"]),
  verification_signal: z.enum([
    "exit_code",
    "api_response",
    "file_hash",
    "accessibility_state",
    "none",
  ]),
  lockable_resources: z.array(z.string()),
  permission_scope: z.string().min(1),
  estimated_latency_ms: z.number().int().nonnegative(),
  estimated_cost_class: z.enum(["free", "low", "medium", "high"]),
  timeout_ms: z.number().int().positive(),
  idempotent: z.boolean(),
  compensation_action_id: z.string().min(1).optional(),
  input_schema: z.record(z.string(), z.unknown()),
  output_schema: z.record(z.string(), z.unknown()),
});

const toolSchema = z.object({
  tool_id: z.string().min(1),
  execution_tier: z.enum([
    "native_runtime",
    "internal_function",
    "api",
    "mcp",
    "cli",
    "accessibility",
    "vision",
    "keyboard_mouse",
  ]),
  deterministic: z.boolean(),
  dependencies: z.array(z.string()),
  target_entity_types: z.array(z.string()),
  supported_actions: z.array(actionSchema).min(1),
});

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): Result<RegisteredTool> {
    const parsed = toolSchema.safeParse(tool);
    if (!parsed.success) {
      return err({
        code: "NOVA-TL002",
        message: "Tool registration is missing required metadata.",
        retryable: false,
        details: { issueCount: parsed.error.issues.length },
      });
    }
    if (this.tools.has(tool.tool_id)) {
      return err({
        code: "NOVA-TL004",
        message: "A tool with this identifier is already registered.",
        retryable: false,
        details: { toolId: tool.tool_id },
      });
    }
    const owned = clone(tool);
    this.tools.set(tool.tool_id, owned);
    return ok(clone(owned));
  }

  get(toolId: string): Result<RegisteredTool> {
    const tool = this.tools.get(toolId);
    return tool ? ok(clone(tool)) : err(this.unavailable(toolId));
  }

  listSummaries(): readonly RegisteredToolSummary[] {
    return [...this.tools.values()]
      .sort((left, right) => left.tool_id.localeCompare(right.tool_id))
      .slice(0, 128)
      .map((tool) => ({
        tool_id: tool.tool_id,
        execution_tier: tool.execution_tier,
        deterministic: tool.deterministic,
        action_count: tool.supported_actions.length,
        read_only_action_count: tool.supported_actions.filter(
          (action) => action.risk_tier === "read_only",
        ).length,
        compensation_action_count: tool.supported_actions.filter(
          (action) => action.compensation_action_id !== undefined,
        ).length,
      }));
  }

  query(filters: {
    readonly target_entity_type?: string;
    readonly execution_tier?: RegisteredTool["execution_tier"];
  }): Result<readonly RegisteredTool[]> {
    const values = [...this.tools.values()].filter((tool) => {
      const targetMatches =
        filters.target_entity_type === undefined ||
        tool.target_entity_types.includes(filters.target_entity_type);
      const tierMatches =
        filters.execution_tier === undefined || tool.execution_tier === filters.execution_tier;
      return targetMatches && tierMatches;
    });
    return ok(values.map(clone));
  }

  deregister(toolId: string): Result<void> {
    if (!this.tools.delete(toolId)) {
      return err(this.unavailable(toolId));
    }
    return ok(undefined);
  }

  private unavailable(toolId: string): ErrorInfo {
    return {
      code: "NOVA-TL004",
      message: "Tool is not registered.",
      retryable: false,
      details: { toolId },
    };
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
