import { describe, expect, it, vi } from "vitest";
import { err, ok } from "@nova/shared";
import type { ExecutionResult, ExecutionStep, VerificationVerdict } from "../src/orchestration.js";
import {
  WorkflowEngine,
  type WorkflowDefinition,
  type WorkflowNode,
} from "../src/workflow-engine.js";

const step = (id: string, locks: readonly string[] = []): ExecutionStep => ({
  step_id: id,
  task_id: "workflow-task",
  correlation_id: "00000000-0000-4000-8000-000000000001",
  capability_id: "capability.test",
  resolved_tool_id: "tool.test",
  action_id: "run",
  parameters: {},
  risk_tier: "read_only",
  execution_tier: "native_runtime",
  required_locks: locks,
  timeout_ms: 1000,
  confirmation_status: "not_required",
});

const task = (id: string, taskStep = step(`step-${id}`)): WorkflowNode => ({
  id,
  type: "task",
  step: taskStep,
});
const definition = (
  nodes: readonly WorkflowNode[],
  edges: WorkflowDefinition["edges"],
  startNodeId = nodes[0]?.id ?? "start",
): WorkflowDefinition => ({
  workflow_id: "workflow.test",
  start_node_id: startNodeId,
  nodes,
  edges,
});

const successfulResult = (stepId: string): ExecutionResult => ({
  step_id: stepId,
  status: "success",
  evidence: { type: "file_hash", value: "hash" },
  affected_resources: [],
});

const verified = (stepId: string): VerificationVerdict => ({
  step_id: stepId,
  outcome: "verified",
  confidence: 1,
  verification_method: "ground_truth",
  explanation: "verified",
});

describe("WorkflowEngine", () => {
  it("rejects missing references and cycles at validation time", () => {
    const engine = new WorkflowEngine({
      execute: async (workflowStep) => ok(successfulResult(workflowStep.step_id)),
      verify: (workflowStep) => ok(verified(workflowStep.step_id)),
    });

    expect(
      engine.validate(definition([task("start")], [{ from: "start", to: "missing" }])),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-WFL001" },
    });
    expect(
      engine.validate(
        definition(
          [task("a"), task("b")],
          [
            { from: "a", to: "b" },
            { from: "b", to: "a" },
          ],
        ),
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-WFL001" } });
  });

  it("executes task nodes through Executor and Verifier and completes only verified work", async () => {
    const executed: string[] = [];
    const engine = new WorkflowEngine({
      execute: async (workflowStep) => {
        executed.push(workflowStep.step_id);
        return ok(successfulResult(workflowStep.step_id));
      },
      verify: (workflowStep) => ok(verified(workflowStep.step_id)),
    });
    const graph = definition(
      [task("start"), task("finish"), { id: "end", type: "end" }],
      [
        { from: "start", to: "finish" },
        { from: "finish", to: "end" },
      ],
    );

    const result = await engine.run(graph, {});

    expect(result).toMatchObject({
      ok: true,
      value: { state: "Completed", completedNodeIds: ["start", "finish", "end"] },
    });
    expect(executed).toEqual(["step-start", "step-finish"]);
  });

  it("fails instead of reporting completion when a task is unverified", async () => {
    const engine = new WorkflowEngine({
      execute: async (workflowStep) => ok(successfulResult(workflowStep.step_id)),
      verify: (workflowStep) => ok({ ...verified(workflowStep.step_id), outcome: "unverified" }),
    });

    const result = await engine.run(
      definition([task("start"), { id: "end", type: "end" }], [{ from: "start", to: "end" }]),
      {},
    );

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-WFL002" } });
  });

  it("enforces a step-count ceiling as a runtime defense in depth", async () => {
    const engine = new WorkflowEngine({
      maxSteps: 2,
      execute: async (workflowStep) => ok(successfulResult(workflowStep.step_id)),
      verify: (workflowStep) => ok(verified(workflowStep.step_id)),
    });
    const graph = definition(
      [task("a"), task("b"), task("c")],
      [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    );

    expect(await engine.run(graph, {})).toMatchObject({
      ok: false,
      error: { code: "NOVA-WFL002" },
    });
  });

  it("times out a node and does not leave the workflow running", async () => {
    const engine = new WorkflowEngine({
      workflowTimeoutMs: 20,
      execute: async () =>
        new Promise((resolve) => setTimeout(() => resolve(ok(successfulResult("step-start"))), 50)),
      verify: (workflowStep) => ok(verified(workflowStep.step_id)),
    });

    expect(await engine.run(definition([task("start")], []), {})).toMatchObject({
      ok: false,
      error: { code: "NOVA-WFL002" },
    });
  });

  it("checkpoints after nodes and resumes from the latest valid checkpoint", async () => {
    let shouldFail = true;
    const execute = vi.fn(async (workflowStep: ExecutionStep) => {
      if (workflowStep.step_id === "step-finish" && shouldFail) {
        return err({ code: "NOVA-TL002", message: "temporary failure", retryable: false });
      }
      return ok(successfulResult(workflowStep.step_id));
    });
    const engine = new WorkflowEngine({
      execute,
      verify: (workflowStep) => ok(verified(workflowStep.step_id)),
    });
    const graph = definition(
      [task("start"), task("finish"), { id: "end", type: "end" }],
      [
        { from: "start", to: "finish" },
        { from: "finish", to: "end" },
      ],
    );

    const failed = await engine.run(graph, {});
    expect(failed).toMatchObject({ ok: false, error: { code: "NOVA-WFL002" } });
    const checkpointId = failed.ok ? "" : String(failed.error.details?.checkpointId ?? "");
    shouldFail = false;

    const resumed = await engine.resume(checkpointId);

    expect(resumed).toMatchObject({ ok: true, value: { state: "Completed" } });
    expect(execute).toHaveBeenCalledTimes(3);
    expect(
      engine
        .getCheckpoints("workflow.test")
        .filter((checkpoint) => checkpoint.state === "Superseded"),
    ).not.toHaveLength(0);
  });

  it("waits for all parallel branches at Join and rolls back on approval denial", async () => {
    const completed: string[] = [];
    const compensate = vi.fn(async () => undefined);
    const engine = new WorkflowEngine({
      execute: async (workflowStep) => {
        completed.push(workflowStep.step_id);
        return ok(successfulResult(workflowStep.step_id));
      },
      verify: (workflowStep) => ok(verified(workflowStep.step_id)),
      approve: async () => false,
      compensate,
    });
    const graph = definition(
      [
        { id: "split", type: "parallel_split" },
        task("left", step("step-left", ["resource.left"])),
        task("right", step("step-right", ["resource.right"])),
        { id: "join", type: "join" },
        { id: "approval", type: "human_approval" },
        { id: "rollback", type: "rollback" },
        { id: "end", type: "end" },
      ],
      [
        { from: "split", to: "left" },
        { from: "split", to: "right" },
        { from: "left", to: "join" },
        { from: "right", to: "join" },
        { from: "join", to: "approval" },
        { from: "approval", to: "end", condition: "approved" },
        { from: "approval", to: "rollback", condition: "denied" },
        { from: "rollback", to: "end" },
      ],
      "split",
    );

    const result = await engine.run(graph, {});

    expect(result).toMatchObject({
      ok: true,
      value: {
        state: "Completed",
        completedNodeIds: ["split", "left", "right", "join", "approval", "rollback", "end"],
      },
    });
    expect(completed.sort()).toEqual(["step-left", "step-right"]);
    expect(compensate).toHaveBeenCalledOnce();
  });
});
