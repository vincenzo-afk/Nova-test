import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { StructuredLogger } from "@nova/shared";
import type { ExecutionResult, ExecutionStep, VerificationVerdict } from "./orchestration.js";

export type WorkflowNode =
  | { readonly id: string; readonly type: "task"; readonly step: ExecutionStep }
  | {
      readonly id: string;
      readonly type: "decision";
      readonly choose: (context: Readonly<Record<string, unknown>>) => string;
    }
  | { readonly id: string; readonly type: "parallel_split" }
  | { readonly id: string; readonly type: "join" }
  | { readonly id: string; readonly type: "human_approval" }
  | { readonly id: string; readonly type: "rollback" }
  | { readonly id: string; readonly type: "end" };

export interface WorkflowEdge {
  readonly from: string;
  readonly to: string;
  readonly condition?: string;
}

export interface WorkflowDefinition {
  readonly workflow_id: string;
  readonly start_node_id: string;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
}

export type WorkflowState = "Running" | "Completed" | "Failed" | "Cancelled";

export interface WorkflowCheckpoint {
  readonly checkpoint_id: string;
  readonly workflow_id: string;
  readonly state: "Created" | "Valid" | "Superseded";
  readonly completedNodeIds: readonly string[];
  readonly context: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface WorkflowCheckpointSummary {
  readonly checkpoint_id: string;
  readonly workflow_id: string;
  readonly state: WorkflowCheckpoint["state"];
  readonly completed_node_count: number;
  readonly created_at: string;
}

export interface WorkflowResult {
  readonly workflow_id: string;
  readonly state: WorkflowState;
  readonly completedNodeIds: readonly string[];
  readonly checkpointId: string;
}

export interface WorkflowEngineOptions {
  readonly execute: (step: ExecutionStep, signal?: AbortSignal) => Promise<Result<ExecutionResult>>;
  readonly verify: (step: ExecutionStep, result: ExecutionResult) => Result<VerificationVerdict>;
  readonly approve?: (
    nodeId: string,
    context: Readonly<Record<string, unknown>>,
  ) => Promise<boolean>;
  readonly compensate?: (
    completedNodeIds: readonly string[],
    context: Readonly<Record<string, unknown>>,
  ) => Promise<void>;
  readonly workflowTimeoutMs?: number;
  readonly maxSteps?: number;
  readonly logger?: StructuredLogger | undefined;
}

interface StoredWorkflow {
  readonly definition: WorkflowDefinition;
  readonly context: Record<string, unknown>;
}

const error = (
  code: "NOVA-WFL001" | "NOVA-WFL002",
  message: string,
  details?: Readonly<Record<string, string | number | boolean>>,
): ErrorInfo => {
  const base = { code, message, retryable: false as const };
  return details === undefined ? base : { ...base, details };
};

export class WorkflowEngine {
  private readonly checkpoints = new Map<string, WorkflowCheckpoint>();
  private readonly workflows = new Map<string, StoredWorkflow>();
  private readonly options: Required<
    Pick<WorkflowEngineOptions, "workflowTimeoutMs" | "maxSteps">
  > &
    WorkflowEngineOptions;
  private checkpointSequence = 0;

  public constructor(options: WorkflowEngineOptions) {
    this.options = {
      workflowTimeoutMs: 24 * 60 * 60 * 1000,
      maxSteps: 10_000,
      ...options,
    };
  }

  public validate(definition: WorkflowDefinition): Result<void> {
    if (definition.nodes.length === 0 || definition.workflow_id.length === 0) {
      return err(error("NOVA-WFL001", "Workflow definition must contain an identifier and nodes."));
    }
    const nodeIds = new Set<string>();
    for (const node of definition.nodes) {
      if (node.id.length === 0 || nodeIds.has(node.id)) {
        return err(error("NOVA-WFL001", "Workflow node identifiers must be non-empty and unique."));
      }
      nodeIds.add(node.id);
    }
    if (!nodeIds.has(definition.start_node_id)) {
      return err(
        error("NOVA-WFL001", "Workflow start node does not exist.", {
          nodeId: definition.start_node_id,
        }),
      );
    }
    const adjacency = new Map<string, string[]>();
    for (const nodeId of nodeIds) adjacency.set(nodeId, []);
    for (const edge of definition.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        return err(
          error("NOVA-WFL001", "Workflow edge references an unknown node.", {
            from: edge.from,
            to: edge.to,
          }),
        );
      }
      adjacency.get(edge.from)?.push(edge.to);
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) return false;
      if (visited.has(nodeId)) return true;
      visiting.add(nodeId);
      for (const next of adjacency.get(nodeId) ?? []) {
        if (!visit(next)) return false;
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return true;
    };
    if (!visit(definition.start_node_id)) {
      return err(error("NOVA-WFL001", "Workflow graph contains a cycle."));
    }
    for (const node of definition.nodes) {
      if (node.type === "join" && (adjacency.get(node.id)?.length ?? 0) === 0) {
        return err(
          error("NOVA-WFL001", "Join node must have an outgoing edge.", { nodeId: node.id }),
        );
      }
    }
    return ok(undefined);
  }

  public async run(
    definition: WorkflowDefinition,
    inputContext: Readonly<Record<string, unknown>>,
  ): Promise<Result<WorkflowResult>> {
    const valid = this.validate(definition);
    if (!valid.ok) return valid;
    const context = { ...inputContext };
    this.workflows.set(definition.workflow_id, { definition, context });
    return this.executeFrom(definition, new Set<string>(), context);
  }

  public async resume(checkpointId: string): Promise<Result<WorkflowResult>> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint || checkpoint.state !== "Valid") {
      return err(
        error("NOVA-WFL002", "Workflow checkpoint is not a valid resumption target.", {
          checkpointId,
        }),
      );
    }
    const stored = this.workflows.get(checkpoint.workflow_id);
    if (!stored)
      return err(
        error("NOVA-WFL002", "Workflow definition for checkpoint is unavailable.", {
          checkpointId,
        }),
      );
    return this.executeFrom(stored.definition, new Set(checkpoint.completedNodeIds), {
      ...checkpoint.context,
    });
  }

  public getCheckpoints(workflowId: string): readonly WorkflowCheckpoint[] {
    return [...this.checkpoints.values()].filter(
      (checkpoint) => checkpoint.workflow_id === workflowId,
    );
  }

  public checkpointSummaries(workflowId: string): readonly WorkflowCheckpointSummary[] {
    return [...this.getCheckpoints(workflowId)]
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) ||
          left.checkpoint_id.localeCompare(right.checkpoint_id),
      )
      .slice(0, 128)
      .map(({ checkpoint_id, workflow_id, state, completedNodeIds, createdAt }) => ({
        checkpoint_id,
        workflow_id,
        state,
        completed_node_count: completedNodeIds.length,
        created_at: createdAt,
      }));
  }

  private async executeFrom(
    definition: WorkflowDefinition,
    completed: Set<string>,
    context: Record<string, unknown>,
  ): Promise<Result<WorkflowResult>> {
    const startedAt = Date.now();
    let current =
      completed.size === 0 ? definition.start_node_id : this.nextPendingNode(definition, completed);
    if (!current) return err(error("NOVA-WFL002", "Workflow has no resumable pending node."));
    let steps = completed.size;
    let checkpointId =
      this.latestCheckpointId(definition.workflow_id) ??
      this.persistCheckpoint(definition.workflow_id, completed, context).checkpoint_id;

    while (current) {
      if (
        Date.now() - startedAt > this.options.workflowTimeoutMs ||
        steps >= this.options.maxSteps
      ) {
        return err(
          error("NOVA-WFL002", "Workflow execution exceeded its configured bound.", {
            checkpointId,
          }),
        );
      }
      const node = definition.nodes.find((candidate) => candidate.id === current);
      if (!node)
        return err(
          error("NOVA-WFL001", "Workflow node disappeared during execution.", { nodeId: current }),
        );
      if (completed.has(node.id)) {
        current = this.nextPendingNode(definition, completed);
        continue;
      }

      if (node.type === "task") {
        let result: Result<ExecutionResult>;
        try {
          result = await this.withTimeout(this.options.execute(node.step), node.step.timeout_ms);
        } catch {
          return err(
            error("NOVA-WFL002", "Workflow task exceeded its configured timeout.", {
              checkpointId,
              nodeId: node.id,
            }),
          );
        }
        if (!result.ok)
          return err(
            error("NOVA-WFL002", "Workflow task execution failed.", {
              checkpointId,
              nodeId: node.id,
            }),
          );
        const verdict = this.options.verify(node.step, result.value);
        if (!verdict.ok || verdict.value.outcome !== "verified") {
          return err(
            error("NOVA-WFL002", "Workflow task did not reach a verified outcome.", {
              checkpointId,
              nodeId: node.id,
            }),
          );
        }
      } else if (node.type === "decision") {
        context[`decision:${node.id}`] = node.choose(context);
      } else if (node.type === "human_approval") {
        let approved = false;
        try {
          approved = await this.withTimeout(
            this.options.approve?.(node.id, context) ?? Promise.resolve(false),
            24 * 60 * 60 * 1000,
          );
        } catch {
          approved = false;
        }
        context[`approval:${node.id}`] = approved;
      } else if (node.type === "rollback") {
        await this.options.compensate?.([...completed], context);
      } else if (node.type === "parallel_split") {
        completed.add(node.id);
        const branches = this.outgoing(definition, node.id);
        const branchControllers = branches.map(() => new AbortController());
        let firstFailure: Result<readonly string[]> | undefined;
        const branchResults = await Promise.all(
          branches.map(async (branch, index) => {
            const branchResult = await this.executeBranch(
              definition,
              branch.to,
              completed,
              startedAt,
              branchControllers[index]?.signal,
            );
            if (!branchResult.ok && firstFailure === undefined) {
              firstFailure = branchResult;
              this.options.logger?.warning("workflow.parallel.branch_failed", {
                workflow_id: definition.workflow_id,
                branch_node_id: branch.to,
              });
              branchControllers.forEach((controller, siblingIndex) => {
                if (siblingIndex !== index) controller.abort();
              });
            }
            return branchResult;
          }),
        );
        if (firstFailure !== undefined && !firstFailure.ok) return err(firstFailure.error);
        for (const branchResult of branchResults) {
          if (branchResult.ok) for (const nodeId of branchResult.value) completed.add(nodeId);
        }
      }
      if (Date.now() - startedAt > this.options.workflowTimeoutMs) {
        return err(
          error("NOVA-WFL002", "Workflow execution exceeded its configured timeout.", {
            checkpointId,
            nodeId: node.id,
          }),
        );
      }

      completed.add(node.id);
      steps += 1;
      checkpointId = this.persistCheckpoint(
        definition.workflow_id,
        completed,
        context,
      ).checkpoint_id;
      if (node.type === "end") {
        return ok({
          workflow_id: definition.workflow_id,
          state: "Completed",
          completedNodeIds: [...completed],
          checkpointId,
        });
      }
      current = this.nextPendingNode(definition, completed, node.id, context);
      if (!current && completed.size < definition.nodes.length) {
        return err(
          error("NOVA-WFL002", "Workflow execution reached a deadlock.", { checkpointId }),
        );
      }
    }
    return err(error("NOVA-WFL002", "Workflow ended without an end node.", { checkpointId }));
  }

  private async executeBranch(
    definition: WorkflowDefinition,
    startNodeId: string,
    completed: Set<string>,
    startedAt: number,
    signal?: AbortSignal,
  ): Promise<Result<readonly string[]>> {
    const branchCompleted = new Set<string>();
    let current: string | undefined = startNodeId;
    while (current && !this.isJoin(definition, current)) {
      if (signal?.aborted) {
        this.options.logger?.info("workflow.parallel.branch_cancelled", {
          workflow_id: definition.workflow_id,
          branch_node_id: startNodeId,
          reason: "sibling_branch_failed",
        });
        return err(error("NOVA-WFL002", "Workflow parallel branch was cancelled."));
      }
      if (Date.now() - startedAt > this.options.workflowTimeoutMs) {
        return err(error("NOVA-WFL002", "Workflow parallel branch exceeded its configured bound."));
      }
      const node = definition.nodes.find((candidate) => candidate.id === current);
      if (!node) return err(error("NOVA-WFL001", "Workflow branch references an unknown node."));
      if (node.type !== "task")
        return err(
          error("NOVA-WFL001", "Parallel branches must contain task nodes before their Join."),
        );
      let result: Result<ExecutionResult>;
      try {
        result = await this.withTimeout(
          this.options.execute(node.step, signal),
          node.step.timeout_ms,
        );
      } catch {
        return err(
          error("NOVA-WFL002", "Workflow parallel branch exceeded its configured timeout.", {
            nodeId: node.id,
          }),
        );
      }
      if (signal?.aborted) {
        this.options.logger?.info("workflow.parallel.branch_cancelled", {
          workflow_id: definition.workflow_id,
          branch_node_id: node.id,
          reason: "sibling_branch_failed",
        });
        return err(
          error("NOVA-WFL002", "Workflow parallel branch was cancelled.", { nodeId: node.id }),
        );
      }
      if (!result.ok)
        return err(error("NOVA-WFL002", "Workflow parallel branch failed.", { nodeId: node.id }));
      const verdict = this.options.verify(node.step, result.value);
      if (!verdict.ok || verdict.value.outcome !== "verified")
        return err(
          error("NOVA-WFL002", "Workflow parallel branch was not verified.", { nodeId: node.id }),
        );
      branchCompleted.add(node.id);
      completed.add(node.id);
      current = this.outgoing(definition, node.id)[0]?.to;
    }
    return ok([...branchCompleted]);
  }

  private nextPendingNode(
    definition: WorkflowDefinition,
    completed: Set<string>,
    fromNodeId = definition.start_node_id,
    context: Readonly<Record<string, unknown>> = {},
  ): string | undefined {
    const candidates = this.outgoing(definition, fromNodeId).filter((edge) => {
      if (edge.condition === undefined) return true;
      const approval = context[`approval:${fromNodeId}`];
      const decision = context[`decision:${fromNodeId}`];
      return (
        edge.condition ===
        (approval === true ? "approved" : approval === false ? "denied" : decision)
      );
    });
    const directPending = candidates
      .map((edge) => edge.to)
      .find((nodeId) => !completed.has(nodeId));
    if (directPending) return directPending;

    for (const edge of definition.edges) {
      if (!completed.has(edge.from) || completed.has(edge.to)) continue;
      const incoming = definition.edges.filter((candidateEdge) => candidateEdge.to === edge.to);
      if (incoming.every((incomingEdge) => completed.has(incomingEdge.from))) return edge.to;
    }
    return undefined;
  }

  private outgoing(definition: WorkflowDefinition, nodeId: string): readonly WorkflowEdge[] {
    return definition.edges.filter((edge) => edge.from === nodeId);
  }

  private isJoin(definition: WorkflowDefinition, nodeId: string): boolean {
    return definition.nodes.some((node) => node.id === nodeId && node.type === "join");
  }

  private latestCheckpointId(workflowId: string): string | undefined {
    return [...this.checkpoints.values()]
      .reverse()
      .find((checkpoint) => checkpoint.workflow_id === workflowId && checkpoint.state === "Valid")
      ?.checkpoint_id;
  }

  private persistCheckpoint(
    workflowId: string,
    completed: Set<string>,
    context: Readonly<Record<string, unknown>>,
  ): WorkflowCheckpoint {
    const previous = this.latestCheckpointId(workflowId);
    if (previous) {
      const old = this.checkpoints.get(previous);
      if (old) this.checkpoints.set(previous, { ...old, state: "Superseded" });
    }
    const checkpoint: WorkflowCheckpoint = {
      checkpoint_id: `${workflowId}:checkpoint:${++this.checkpointSequence}`,
      workflow_id: workflowId,
      state: "Valid",
      completedNodeIds: [...completed],
      context: { ...context },
      createdAt: new Date().toISOString(),
    };
    this.checkpoints.set(checkpoint.checkpoint_id, checkpoint);
    return checkpoint;
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Workflow node timed out.")), timeoutMs);
      operation.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (reason: unknown) => {
          clearTimeout(timer);
          reject(reason);
        },
      );
    });
  }
}
