import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { err, ok, type Result } from "@nova/shared";
import type { RegisteredTool } from "./tool-registry.js";
import type { ToolAction, ToolRegistration } from "./orchestration.js";

export interface WorkspaceCodeExecutorOptions {
  readonly workspaceRoot: string;
  readonly runtimes: Readonly<Record<string, string>>;
  readonly maxTimeoutMs?: number;
  readonly maxOutputBytes?: number;
}

export interface WorkspaceCodeRequest {
  readonly runtime_id: string;
  readonly script_path: string;
  readonly args: readonly string[];
  readonly timeout_ms: number;
}

export interface WorkspaceCodeEvidence {
  readonly exit_code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timed_out?: boolean;
}

export interface WorkspaceCodeResult {
  readonly status: "success" | "failure";
  readonly evidence: { readonly type: "exit_code"; readonly value: WorkspaceCodeEvidence };
  readonly affected_resources: readonly string[];
  readonly error?: { readonly category: "transient" | "permanent"; readonly message: string };
}

export interface WorkspaceCodeTool {
  readonly metadata: RegisteredTool;
  readonly registration: ToolRegistration;
}

export class WorkspaceCodeExecutor {
  private readonly workspaceRoot: string;
  private readonly runtimes: Readonly<Record<string, string>>;
  private readonly maxTimeoutMs: number;
  private readonly maxOutputBytes: number;

  public constructor(options: WorkspaceCodeExecutorOptions) {
    this.workspaceRoot = resolve(options.workspaceRoot);
    this.runtimes = options.runtimes;
    this.maxTimeoutMs = options.maxTimeoutMs ?? 300_000;
    this.maxOutputBytes = options.maxOutputBytes ?? 1_048_576;
  }

  public async run(request: WorkspaceCodeRequest): Promise<Result<WorkspaceCodeResult>> {
    const runtime = this.runtimes[request.runtime_id];
    if (!runtime) {
      return err({
        code: "NOVA-TL004",
        message: "Requested code runtime is not registered.",
        retryable: false,
        details: { runtimeId: request.runtime_id },
      });
    }
    if (!Number.isInteger(request.timeout_ms) || request.timeout_ms <= 0) {
      return err({
        code: "NOVA-TL002",
        message: "Code execution timeout must be a positive integer.",
        retryable: false,
      });
    }
    if (request.timeout_ms > this.maxTimeoutMs) {
      return err({
        code: "NOVA-SEC001",
        message: "Code execution timeout exceeds the configured workspace limit.",
        retryable: false,
        details: { maxTimeoutMs: this.maxTimeoutMs },
      });
    }
    if (!request.script_path || !request.args.every((argument) => typeof argument === "string")) {
      return err({
        code: "NOVA-TL002",
        message: "Code execution requires a script path and string arguments.",
        retryable: false,
      });
    }

    const workspace = await this.canonicalExistingDirectory();
    if (!workspace.ok) return workspace;
    const script = await this.canonicalScript(request.script_path, workspace.value);
    if (!script.ok) return script;

    return await this.spawnScript(
      runtime,
      script.value,
      request.args,
      request.timeout_ms,
      workspace.value,
    );
  }

  private async canonicalExistingDirectory(): Promise<Result<string>> {
    try {
      const canonical = await realpath(this.workspaceRoot);
      const details = await stat(canonical);
      if (!details.isDirectory()) throw new Error("Workspace root is not a directory.");
      return ok(canonical);
    } catch (cause) {
      return err({
        code: "NOVA-SEC001",
        message: cause instanceof Error ? cause.message : "Workspace root is unavailable.",
        retryable: false,
      });
    }
  }

  private async canonicalScript(path: string, workspace: string): Promise<Result<string>> {
    const candidate = isAbsolute(path) ? path : resolve(workspace, path);
    if (!isContained(candidate, workspace)) {
      return err({
        code: "NOVA-SEC001",
        message: "Code script is outside the allowed workspace.",
        retryable: false,
        details: { scriptPath: path },
      });
    }
    try {
      const canonical = await realpath(candidate);
      const details = await stat(canonical);
      if (!details.isFile() || !isContained(canonical, workspace))
        throw new Error("Code script is not a workspace file.");
      return ok(canonical);
    } catch (cause) {
      return err({
        code: "NOVA-TL004",
        message: cause instanceof Error ? cause.message : "Code script is unavailable.",
        retryable: false,
      });
    }
  }

  private async spawnScript(
    runtime: string,
    script: string,
    args: readonly string[],
    timeoutMs: number,
    workspace: string,
  ): Promise<Result<WorkspaceCodeResult>> {
    return await new Promise((resolveResult) => {
      const child = spawn(runtime, [script, ...args], {
        cwd: workspace,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      let outputOverflow = false;
      let timedOut = false;
      let settled = false;
      const append = (current: string, chunk: Buffer): string => {
        const next = current + chunk.toString("utf8");
        if (Buffer.byteLength(next, "utf8") > this.maxOutputBytes) {
          outputOverflow = true;
          return next.slice(0, this.maxOutputBytes);
        }
        return next;
      };
      child.stdout.on("data", (chunk: Buffer) => {
        stdout = append(stdout, chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = append(stderr, chunk);
      });
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);
      const finish = (exitCode: number | null, spawnError?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const evidence: WorkspaceCodeEvidence = {
          exit_code: exitCode,
          stdout,
          stderr,
          ...(timedOut ? { timed_out: true } : {}),
        };
        if (timedOut) {
          resolveResult(
            ok({
              status: "failure",
              evidence: { type: "exit_code", value: evidence },
              affected_resources: [script],
              error: { category: "transient", message: "Tool execution timed out." },
            }),
          );
          return;
        }
        if (outputOverflow) {
          resolveResult(
            ok({
              status: "failure",
              evidence: { type: "exit_code", value: evidence },
              affected_resources: [script],
              error: {
                category: "permanent",
                message: "Tool output exceeded the configured limit.",
              },
            }),
          );
          return;
        }
        const successful = !spawnError && exitCode === 0;
        resolveResult(
          ok({
            status: successful ? "success" : "failure",
            evidence: { type: "exit_code", value: evidence },
            affected_resources: [script],
            ...(successful
              ? {}
              : {
                  error: {
                    category: "permanent" as const,
                    message:
                      spawnError?.message ?? `Tool exited with code ${exitCode ?? "unknown"}.`,
                  },
                }),
          }),
        );
      };
      child.once("error", (error: Error) => finish(null, error));
      child.once("close", (exitCode: number | null) => finish(exitCode));
    });
  }
}

export const createWorkspaceCodeTool = (
  options: WorkspaceCodeExecutorOptions,
): WorkspaceCodeTool => {
  const executor = new WorkspaceCodeExecutor(options);
  const action: ToolAction = {
    risk_tier: "destructive_irreversible",
    verification_signal: "exit_code",
    idempotent: false,
    execute: async (parameters) => {
      const runtimeId = parameters.runtime_id;
      const scriptPath = parameters.script_path;
      const rawArgs = parameters.args;
      const timeout = parameters.timeout_ms;
      if (
        typeof runtimeId !== "string" ||
        typeof scriptPath !== "string" ||
        !Array.isArray(rawArgs) ||
        !rawArgs.every((argument) => typeof argument === "string") ||
        typeof timeout !== "number"
      ) {
        return {
          status: "failure",
          evidence: { type: "exit_code", value: { exit_code: null, stdout: "", stderr: "" } },
          affected_resources: [],
          error: {
            category: "validation" as const,
            message: "Code execution parameters are malformed.",
          },
        };
      }
      const result = await executor.run({
        runtime_id: runtimeId,
        script_path: scriptPath,
        args: rawArgs,
        timeout_ms: timeout,
      });
      if (!result.ok) {
        return {
          status: "failure",
          evidence: { type: "exit_code", value: { exit_code: null, stdout: "", stderr: "" } },
          affected_resources: [],
          error: {
            category: result.error.code === "NOVA-SEC001" ? "security" : "validation",
            message: result.error.message,
          },
        };
      }
      return result.value;
    },
  };
  const metadata: RegisteredTool = {
    tool_id: "nova.workspace-code",
    execution_tier: "cli",
    deterministic: true,
    dependencies: ["workspace"],
    target_entity_types: ["workspace", "file"],
    supported_actions: [
      {
        action_id: "run_script",
        risk_tier: "destructive_irreversible",
        verification_signal: "exit_code",
        lockable_resources: ["workspace"],
        permission_scope: "workspace:code-execution",
        estimated_latency_ms: 500,
        estimated_cost_class: "free",
        timeout_ms: options.maxTimeoutMs ?? 300_000,
        idempotent: false,
        input_schema: {
          type: "object",
          required: ["runtime_id", "script_path", "args", "timeout_ms"],
          properties: {
            runtime_id: { type: "string" },
            script_path: { type: "string" },
            args: { type: "array", items: { type: "string" } },
            timeout_ms: { type: "integer", minimum: 1 },
          },
        },
        output_schema: {
          type: "object",
          required: ["status", "evidence", "affected_resources"],
        },
      },
    ],
  };
  return {
    metadata,
    registration: {
      tool_id: metadata.tool_id,
      deterministic: true,
      actions: { run_script: action },
    },
  };
};

function isContained(candidate: string, scope: string): boolean {
  const relativePath = relative(scope, resolve(candidate));
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== "..");
}
