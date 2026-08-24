import {
  WorkflowEngine,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowNode,
} from "@nova/runtime";
import type { ExecutionStep } from "@nova/runtime";

export type WorkflowDraftNodeType =
  "task" | "decision" | "parallel_split" | "join" | "human_approval" | "rollback" | "end";

export interface WorkflowDraftNode {
  readonly id: string;
  readonly type: WorkflowDraftNodeType;
}

export interface WorkflowDraft {
  readonly workflow_id: string;
  readonly start_node_id: string;
  readonly nodes: readonly WorkflowDraftNode[];
  readonly edges: readonly WorkflowEdge[];
}

export type WorkflowDraftValidation =
  | {
      readonly valid: true;
      readonly workflow_id: string;
      readonly node_count: number;
      readonly edge_count: number;
    }
  | {
      readonly valid: false;
      readonly code: "NOVA-WFL001" | "NOVA-WFL002";
      readonly message: string;
    };

export function validateWorkflowDraft(draft: WorkflowDraft): WorkflowDraftValidation {
  const definition: WorkflowDefinition = {
    workflow_id: draft.workflow_id,
    start_node_id: draft.start_node_id,
    nodes: draft.nodes.map(toWorkflowNode),
    edges: draft.edges,
  };
  const engine = new WorkflowEngine({
    execute: async () => ({
      ok: true,
      value: {
        step_id: "draft",
        status: "success",
        evidence: { type: "none", value: null },
        affected_resources: [],
      },
    }),
    verify: (step) => ({
      ok: true,
      value: {
        step_id: step.step_id,
        outcome: "verified",
        confidence: 1,
        verification_method: "ground_truth",
        explanation: "Draft validation only.",
      },
    }),
  });
  const result = engine.validate(definition);
  return result.ok
    ? {
        valid: true,
        workflow_id: draft.workflow_id,
        node_count: draft.nodes.length,
        edge_count: draft.edges.length,
      }
    : {
        valid: false,
        code: result.error.code as "NOVA-WFL001" | "NOVA-WFL002",
        message: result.error.message,
      };
}

function toWorkflowNode(node: WorkflowDraftNode): WorkflowNode {
  if (node.type === "task") return { id: node.id, type: node.type, step: draftStep(node.id) };
  if (node.type === "decision") return { id: node.id, type: node.type, choose: () => "" };
  return { id: node.id, type: node.type };
}

function draftStep(nodeId: string): ExecutionStep {
  return {
    step_id: `draft:${nodeId}`,
    task_id: "workflow-draft",
    correlation_id: "00000000-0000-4000-8000-000000000000",
    capability_id: "workflow.draft",
    resolved_tool_id: "workflow.draft",
    action_id: "validate",
    parameters: {},
    risk_tier: "read_only",
    execution_tier: "internal_function",
    required_locks: [],
    timeout_ms: 1,
    confirmation_status: "not_required",
  };
}
