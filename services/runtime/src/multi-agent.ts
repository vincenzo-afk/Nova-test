import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface AgentBranchResult {
  readonly branch_id: string;
  readonly status: "completed" | "failed";
  readonly result: unknown;
}

export interface AgentBranch {
  readonly branch_id: string;
  readonly permission_scope: ReadonlySet<string>;
  readonly run: () => Promise<AgentBranchResult>;
}

export interface AgentEventBus {
  readonly publish: (event: {
    readonly type: string;
    readonly parent_task_id: string;
    readonly branch_id: string;
    readonly status: string;
  }) => Promise<void>;
}

export interface ParentTaskResult {
  readonly parent_task_id: string;
  readonly status: "completed" | "partial";
  readonly branches: readonly AgentBranchResult[];
}

export class MultiAgentCoordinator {
  public constructor(private readonly bus: AgentEventBus) {}

  public async run(
    parentTaskId: string,
    branches: readonly AgentBranch[],
    parentPermissions: ReadonlySet<string>,
  ): Promise<Result<ParentTaskResult>> {
    for (const branch of branches) {
      for (const permission of branch.permission_scope) {
        if (!parentPermissions.has(permission))
          return err(this.securityError("Agent branch exceeds parent permission scope."));
      }
    }
    const results = await Promise.all(
      branches.map(async (branch) => {
        try {
          const result = await branch.run();
          await this.bus.publish({
            type: "agent.branch.completed",
            parent_task_id: parentTaskId,
            branch_id: branch.branch_id,
            status: result.status,
          });
          return result;
        } catch {
          const result: AgentBranchResult = {
            branch_id: branch.branch_id,
            status: "failed",
            result: null,
          };
          await this.bus.publish({
            type: "agent.branch.failed",
            parent_task_id: parentTaskId,
            branch_id: branch.branch_id,
            status: result.status,
          });
          return result;
        }
      }),
    );
    const status = results.every((result) => result.status === "completed")
      ? "completed"
      : "partial";
    return ok({ parent_task_id: parentTaskId, status, branches: results });
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
