import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import { z } from "zod";

export type RiskTier = "read_only" | "reversible_write" | "destructive_irreversible";
export type ExecutionTier =
  | "native_runtime"
  | "internal_function"
  | "api"
  | "mcp"
  | "cli"
  | "accessibility"
  | "vision"
  | "keyboard_mouse";
export type VerificationSignal =
  "exit_code" | "api_response" | "file_hash" | "accessibility_state" | "none";
export type EvidenceType = VerificationSignal;
export type ExecutionStatus = "success" | "failure" | "partial";
export type VerificationOutcome = "verified" | "unverified" | "failed";
export type FailureCategory =
  "transient" | "permanent" | "user" | "external" | "security" | "validation" | "internal";

export interface ExecutionStep {
  readonly step_id: string;
  readonly task_id: string;
  readonly correlation_id: string;
  readonly capability_id: string;
  readonly resolved_tool_id: string;
  readonly action_id: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly risk_tier: RiskTier;
  readonly execution_tier: ExecutionTier;
  readonly required_locks: readonly string[];
  readonly timeout_ms: number;
  readonly confirmation_status: "not_required" | "pending" | "approved" | "denied";
}

export interface ExecutionEvidence {
  readonly type: EvidenceType;
  readonly value: unknown;
}

export interface ExecutionError {
  readonly category: FailureCategory;
  readonly message: string;
}

export interface ExecutionResult {
  readonly step_id: string;
  readonly status: ExecutionStatus;
  readonly evidence: ExecutionEvidence;
  readonly affected_resources: readonly string[];
  readonly error?: ExecutionError;
}

export interface VerificationVerdict {
  readonly step_id: string;
  readonly outcome: VerificationOutcome;
  readonly confidence: number;
  readonly verification_method: "ground_truth" | "vision_secondary";
  readonly explanation: string;
}

export interface ToolAction {
  readonly risk_tier: RiskTier;
  readonly verification_signal: VerificationSignal;
  readonly idempotent: boolean;
  readonly execute: (
    parameters: Readonly<Record<string, unknown>>,
  ) => Promise<Omit<ExecutionResult, "step_id">>;
}

export interface ToolRegistration {
  readonly tool_id: string;
  readonly deterministic: boolean;
  readonly actions: Readonly<Record<string, ToolAction>>;
}

const executionStepSchema = z.object({
  step_id: z.string().min(1),
  task_id: z.string().min(1),
  correlation_id: z.string().uuid(),
  capability_id: z.string().min(1),
  resolved_tool_id: z.string().min(1),
  action_id: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()),
  risk_tier: z.enum(["read_only", "reversible_write", "destructive_irreversible"]),
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
  required_locks: z.array(z.string()),
  timeout_ms: z.number().int().positive(),
  confirmation_status: z.enum(["not_required", "pending", "approved", "denied"]),
});

export interface PlannerDependencies {
  readonly deterministic: ReadonlyMap<string, ExecutionStep>;
  readonly llmPlanner?: (goal: string) => Promise<readonly ExecutionStep[]>;
}

export class Planner {
  constructor(private readonly dependencies: PlannerDependencies) {}

  async plan(input: {
    readonly task_id: string;
    readonly goal: string;
  }): Promise<Result<readonly ExecutionStep[]>> {
    const deterministicStep = this.dependencies.deterministic.get(input.goal);
    if (deterministicStep) {
      const normalized = {
        ...deterministicStep,
        task_id: input.task_id,
        confirmation_status: "not_required" as const,
      };
      const parsed = executionStepSchema.safeParse(normalized);
      return parsed.success
        ? ok([parsed.data])
        : err(this.validationError("Deterministic step failed contract validation."));
    }

    if (!this.dependencies.llmPlanner) {
      return err({
        code: "NOVA-AI001",
        message: "No deterministic resolution exists and no model planner is available.",
        retryable: false,
      });
    }

    const candidates = await this.dependencies.llmPlanner(input.goal);
    const steps = candidates.map((candidate) => ({
      ...candidate,
      task_id: input.task_id,
      confirmation_status:
        candidate.confirmation_status === "approved" ? "pending" : candidate.confirmation_status,
    }));
    const parsed = z.array(executionStepSchema).safeParse(steps);
    return parsed.success
      ? ok(parsed.data)
      : err(this.validationError("Model-generated plan failed contract validation."));
  }

  private validationError(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

export interface PermissionOptions {
  readonly allowedToolIds: ReadonlySet<string>;
  readonly confirmationTimeoutMs: number;
}

export class PermissionManager {
  constructor(private readonly options: PermissionOptions) {}

  authorize(step: ExecutionStep, tool: ToolRegistration): Result<"allowed"> {
    if (!this.options.allowedToolIds.has(tool.tool_id)) {
      return err({
        code: "NOVA-SEC001",
        message: "Tool is outside the agent-scoped allowlist.",
        retryable: false,
        details: { toolId: tool.tool_id },
      });
    }

    const action = tool.actions[step.action_id];
    if (!action) {
      return err({
        code: "NOVA-TL004",
        message: "Requested tool action is unavailable.",
        retryable: false,
      });
    }

    if (action.risk_tier === "read_only") {
      return ok("allowed");
    }

    if (step.confirmation_status !== "approved" || this.options.confirmationTimeoutMs <= 0) {
      return err({
        code: "NOVA-SEC001",
        message: "Explicit confirmation is required before this action can execute.",
        retryable: false,
      });
    }

    return ok("allowed");
  }
}

export class Executor {
  constructor(
    private readonly permissionManager: PermissionManager,
    private readonly tools: ReadonlyMap<string, ToolRegistration>,
  ) {}

  async execute(step: ExecutionStep): Promise<Result<ExecutionResult>> {
    const tool = this.tools.get(step.resolved_tool_id);
    if (!tool) {
      return err({
        code: "NOVA-TL004",
        message: "Requested tool is unavailable.",
        retryable: false,
      });
    }

    const permission = this.permissionManager.authorize(step, tool);
    if (!permission.ok) {
      return permission;
    }

    const action = tool.actions[step.action_id];
    if (!action) {
      return err({
        code: "NOVA-TL004",
        message: "Requested tool action is unavailable.",
        retryable: false,
      });
    }

    try {
      const result = await action.execute(step.parameters);
      return ok({ ...result, step_id: step.step_id });
    } catch (cause) {
      return err({
        code: "NOVA-TL002",
        message: cause instanceof Error ? cause.message : "Tool invocation failed.",
        retryable: action.idempotent,
      });
    }
  }
}

export class Verifier {
  verify(step: ExecutionStep, result: ExecutionResult): Result<VerificationVerdict> {
    if (step.step_id !== result.step_id) {
      return err({
        code: "NOVA-TL002",
        message: "Executor result step_id does not match the planned step.",
        retryable: false,
      });
    }

    if (result.status === "failure" || result.status === "partial") {
      return ok({
        step_id: step.step_id,
        outcome: "failed",
        confidence: 1,
        verification_method: "ground_truth",
        explanation: "Ground-truth evidence confirms the step failed or only partially completed.",
      });
    }

    if (result.evidence.type === "none") {
      return ok({
        step_id: step.step_id,
        outcome: "unverified",
        confidence: 0,
        verification_method: "ground_truth",
        explanation: "No sufficient verification signal was provided.",
      });
    }

    return ok({
      step_id: step.step_id,
      outcome: "verified",
      confidence: 1,
      verification_method: "ground_truth",
      explanation: "Ground-truth evidence confirms the step result.",
    });
  }
}
