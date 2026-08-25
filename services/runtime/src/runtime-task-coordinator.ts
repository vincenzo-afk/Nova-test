import { createMessage, type CommunicationBus, type Result } from "@nova/shared";
import type {
  ExecutionResult,
  ExecutionStep,
  Executor,
  Planner,
  VerificationVerdict,
  Verifier,
} from "./orchestration.js";
import type { TaskManager, TaskRecord } from "./task-manager.js";

export interface TaskCheckpointPersistence {
  append(record: TaskRecord, status: "Created" | "Valid"): Promise<Result<void>>;
}

export interface RuntimeTaskCoordinatorOptions {
  readonly tasks: TaskManager;
  readonly planner: Planner;
  readonly executor: Executor;
  readonly verifier: Verifier;
  readonly events: CommunicationBus;
  readonly persistence?: TaskCheckpointPersistence;
  readonly sourceService?: string;
}

export class RuntimeTaskCoordinator {
  private readonly sourceService: string;

  public constructor(private readonly options: RuntimeTaskCoordinatorOptions) {
    this.sourceService = options.sourceService ?? "runtime.task-coordinator";
  }

  public submit(input: {
    readonly goal: string;
    readonly correlation_id?: string;
    readonly task_id?: string;
  }): Result<TaskRecord> {
    const created = this.options.tasks.create(input);
    if (created.ok) void this.publish(created.value).catch(() => undefined);
    return created;
  }

  public async submitDurable(input: {
    readonly goal: string;
    readonly correlation_id?: string;
    readonly task_id?: string;
  }): Promise<Result<TaskRecord>> {
    const created = this.options.tasks.create(input);
    if (!created.ok) return created;
    const persisted = await this.persist(created.value, "Created");
    if (!persisted.ok) return persisted;
    await this.publish(created.value);
    return created;
  }

  public async retry(taskId: string, confirmed: boolean): Promise<Result<TaskRecord>> {
    if (!confirmed) {
      return {
        ok: false,
        error: {
          code: "NOVA-SEC001",
          message: "Retrying a task requires explicit confirmation.",
          retryable: false,
        },
      };
    }
    const transitioned = this.options.tasks.transition(taskId, "Retrying");
    if (!transitioned.ok) return transitioned;
    const persisted = await this.persist(transitioned.value, "Valid");
    if (!persisted.ok) return persisted;
    await this.publish(transitioned.value);
    return this.execute(taskId);
  }

  public async resumePaused(taskId: string, confirmed: boolean): Promise<Result<TaskRecord>> {
    if (!confirmed) {
      return {
        ok: false,
        error: {
          code: "NOVA-SEC001",
          message: "Resuming a paused task requires explicit confirmation.",
          retryable: false,
        },
      };
    }
    const current = this.options.tasks.get(taskId);
    if (!current.ok) return current;
    if (current.value.state !== "Paused") {
      return {
        ok: false,
        error: {
          code: "NOVA-TL002",
          message: "Only paused tasks can be resumed.",
          retryable: false,
          details: { taskId, state: current.value.state },
        },
      };
    }
    return this.execute(taskId);
  }

  public async execute(taskId: string): Promise<Result<TaskRecord>> {
    const current = this.options.tasks.get(taskId);
    if (!current.ok) return current;

    const planning = await this.transition(taskId, "Planning");
    if (!planning.ok) return planning;
    const plan = await this.options.planner.plan({
      task_id: planning.value.task_id,
      goal: planning.value.goal,
    });
    if (!plan.ok) return this.fail(taskId, { phase: "planning", error: plan.error });
    if (plan.value.length === 0) {
      return this.fail(taskId, {
        phase: "planning",
        error: { code: "NOVA-TL002", message: "Planner returned no executable steps." },
      });
    }

    const executing = await this.transition(taskId, "Executing");
    if (!executing.ok) return executing;
    const executions: Array<{ readonly step: ExecutionStep; readonly result: ExecutionResult }> =
      [];
    for (const step of plan.value) {
      const execution = await this.options.executor.execute(step);
      if (!execution.ok)
        return this.fail(taskId, { phase: "execution", step, error: execution.error });
      executions.push({ step, result: execution.value });
    }

    const verifying = await this.transition(taskId, "Verifying");
    if (!verifying.ok) return verifying;
    const verdicts: Array<{
      readonly step: ExecutionStep;
      readonly result: ExecutionResult;
      readonly verdict: VerificationVerdict;
    }> = [];
    for (const execution of executions) {
      const verdict = this.options.verifier.verify(execution.step, execution.result);
      if (!verdict.ok) return this.fail(taskId, { phase: "verification", error: verdict.error });
      verdicts.push({ ...execution, verdict: verdict.value });
    }

    for (const entry of verdicts) {
      const history = await this.appendStepHistory(taskId, entry);
      if (!history.ok) return history;
    }
    const outcome = verdicts.some((entry) => entry.verdict.outcome === "failed")
      ? "Failed"
      : verdicts.some((entry) => entry.verdict.outcome === "unverified")
        ? "Unverified"
        : "Completed";
    return this.transition(taskId, outcome);
  }

  private async fail(
    taskId: string,
    history: Readonly<Record<string, unknown>>,
  ): Promise<Result<TaskRecord>> {
    const appended = await this.appendStepHistory(taskId, history);
    if (!appended.ok) return appended;
    return this.transition(taskId, "Failed");
  }

  private async transition(
    taskId: string,
    target: "Planning" | "Executing" | "Verifying" | "Completed" | "Unverified" | "Failed",
  ): Promise<Result<TaskRecord>> {
    const transitioned = this.options.tasks.transition(taskId, target);
    if (!transitioned.ok) return transitioned;
    const persisted = await this.persist(transitioned.value, "Valid");
    if (!persisted.ok) return persisted;
    await this.publish(transitioned.value);
    return transitioned;
  }

  private async appendStepHistory(taskId: string, step: unknown): Promise<Result<TaskRecord>> {
    const appended = this.options.tasks.appendStepHistory(taskId, step);
    if (!appended.ok) return appended;
    const persisted = await this.persist(appended.value, "Valid");
    if (!persisted.ok) return persisted;
    return appended;
  }

  private async persist(record: TaskRecord, status: "Created" | "Valid"): Promise<Result<void>> {
    if (!this.options.persistence) return { ok: true, value: undefined };
    return this.options.persistence.append(record, status);
  }

  private async publish(record: TaskRecord): Promise<void> {
    const result = await this.options.events.publish(
      createMessage({
        topic: "task.progress",
        schema_version: "1.0.0",
        correlation_id: record.correlation_id,
        source_service: this.sourceService,
        payload: {
          task_id: record.task_id,
          goal: record.goal,
          state: record.state,
          retry_count: record.retry_count,
          updated_at: record.updated_at,
        },
      }),
    );
    if (!result.ok) throw new Error(result.error.message);
  }
}
