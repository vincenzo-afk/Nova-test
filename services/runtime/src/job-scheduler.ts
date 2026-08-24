import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";

export type JobType = "recurring" | "cron" | "delayed";
export type JobPriority = "low" | "normal";
export type JobStatus = "scheduled" | "running" | "completed" | "failed" | "cancelled";

export interface JobDefinition {
  readonly job_id: string;
  readonly type: JobType;
  readonly schedule: string;
  readonly dependencies: readonly string[];
  readonly priority: JobPriority;
  readonly concurrency_group: string;
  readonly idempotent: boolean;
  readonly skip_missed_occurrences?: boolean;
}

export interface JobState {
  readonly definition: JobDefinition;
  readonly last_run_at: string | null;
  readonly next_run_at: string;
  readonly status: JobStatus;
  readonly last_error?: string;
}

export interface JobStore {
  load(): readonly JobState[];
  save(states: readonly JobState[]): void;
}

export type JobRunner = (job: JobDefinition, signal: AbortSignal) => Promise<void>;

export interface JobSchedulerOptions {
  readonly runner: JobRunner;
  readonly now?: () => number;
  readonly logger?: StructuredLogger;
}

export class InMemoryJobStore implements JobStore {
  private states: readonly JobState[];

  public constructor(initial: readonly JobState[] = []) {
    this.states = clone(initial);
  }

  public load(): readonly JobState[] {
    return clone(this.states);
  }

  public save(states: readonly JobState[]): void {
    this.states = clone(states);
  }
}

export class FileJobStore implements JobStore {
  public constructor(private readonly path: string) {}

  public load(): readonly JobState[] {
    if (!existsSync(this.path)) return [];
    const parsed: unknown = JSON.parse(readFileSync(this.path, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("Persisted job state must be an array.");
    return clone(parsed as readonly JobState[]);
  }

  public save(states: readonly JobState[]): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporaryPath = join(this.path, `.jobs-${process.pid}-${Date.now()}.tmp`);
    writeFileSync(temporaryPath, `${JSON.stringify(states)}\n`, { encoding: "utf8", flag: "wx" });
    renameSync(temporaryPath, this.path);
  }
}

export class JobScheduler {
  private readonly jobs = new Map<string, JobState>();
  private readonly running = new Map<string, AbortController>();
  private readonly groups = new Set<string>();
  private readonly now: () => number;
  private runDuePromise: Promise<Result<readonly string[]>> | undefined;

  public constructor(
    private readonly store: JobStore,
    private readonly options: JobSchedulerOptions,
  ) {
    this.now = options.now ?? Date.now;
  }

  public register(definition: JobDefinition): Result<JobState> {
    const validation = validateDefinition(definition);
    if (!validation.ok) return validation;
    if (this.jobs.has(definition.job_id))
      return err(this.failure("A job with this identifier is already registered."));
    if (definition.dependencies.includes(definition.job_id))
      return err(this.failure("A job cannot depend on itself."));

    const state: JobState = {
      definition: clone(definition),
      last_run_at: null,
      next_run_at: new Date(this.initialOccurrence(definition, this.now())).toISOString(),
      status: "scheduled",
    };
    this.jobs.set(definition.job_id, state);
    this.persist();
    this.options.logger?.info("job.registered", {
      job_id: definition.job_id,
      type: definition.type,
      priority: definition.priority,
      concurrency_group: definition.concurrency_group,
    });
    return ok(clone(state));
  }

  public async start(): Promise<Result<readonly string[]>> {
    let persisted: readonly JobState[];
    try {
      persisted = this.store.load();
    } catch {
      return err(this.failure("Persisted job state could not be loaded."));
    }
    this.jobs.clear();
    for (const state of persisted) {
      const validation = validateDefinition(state.definition);
      if (!validation.ok || this.jobs.has(state.definition.job_id))
        return err(this.failure("Persisted job state contains an invalid or duplicate job."));
      this.jobs.set(state.definition.job_id, clone(state));
    }
    for (const state of this.jobs.values()) {
      if (
        state.definition.skip_missed_occurrences === true &&
        state.status === "scheduled" &&
        Date.parse(state.next_run_at) <= this.now()
      ) {
        this.jobs.set(state.definition.job_id, {
          ...state,
          next_run_at: new Date(this.nextOccurrence(state.definition, this.now())).toISOString(),
        });
      }
    }
    this.persist();
    this.options.logger?.info("job.scheduler.started", {
      job_count: this.jobs.size,
      missed_run_count: [...this.jobs.values()].filter(
        (state) => state.status === "scheduled" && Date.parse(state.next_run_at) <= this.now(),
      ).length,
    });
    return this.runDue();
  }

  public async runDue(): Promise<Result<readonly string[]>> {
    if (this.runDuePromise) return this.runDuePromise;
    this.runDuePromise = this.runDueInternal();
    try {
      return await this.runDuePromise;
    } finally {
      this.runDuePromise = undefined;
    }
  }

  public get(jobId: string): Result<JobState> {
    const state = this.jobs.get(jobId);
    return state ? ok(clone(state)) : err(this.failure("Job is not registered."));
  }

  public cancel(jobId: string): Result<void> {
    const state = this.jobs.get(jobId);
    if (!state) return err(this.failure("Job is not registered."));
    const controller = this.running.get(jobId);
    if (controller) {
      controller.abort();
      this.jobs.set(jobId, { ...state, status: "cancelled" });
    } else if (state.status === "scheduled") {
      this.jobs.set(jobId, { ...state, status: "cancelled" });
    } else {
      return err(this.failure("Only a scheduled or running job can be cancelled."));
    }
    this.persist();
    this.options.logger?.info("job.cancelled", {
      job_id: jobId,
      was_running: controller !== undefined,
    });
    return ok(undefined);
  }

  public activeGroups(): readonly string[] {
    return [...this.groups].sort();
  }

  private async runDueInternal(): Promise<Result<readonly string[]>> {
    const due = [...this.jobs.values()]
      .filter(
        (state) => state.status === "scheduled" && Date.parse(state.next_run_at) <= this.now(),
      )
      .sort((left, right) => {
        const priority =
          left.definition.priority === right.definition.priority
            ? 0
            : left.definition.priority === "normal"
              ? -1
              : 1;
        return priority || Date.parse(left.next_run_at) - Date.parse(right.next_run_at);
      });
    const executed: string[] = [];
    const completed = new Set<string>();
    for (const state of due) {
      const ran = await this.runJob(state.definition.job_id, new Set<string>(), completed);
      if (ran) executed.push(state.definition.job_id);
    }
    return ok(executed);
  }

  private async runJob(
    jobId: string,
    visiting: Set<string>,
    completed: Set<string>,
  ): Promise<boolean> {
    if (completed.has(jobId)) return true;
    const state = this.jobs.get(jobId);
    if (!state || state.status !== "scheduled") return false;
    if (visiting.has(jobId)) {
      this.failJob(jobId, "Job dependency cycle detected.");
      return false;
    }
    visiting.add(jobId);
    for (const dependencyId of state.definition.dependencies) {
      const dependency = this.jobs.get(dependencyId);
      if (!dependency) {
        visiting.delete(jobId);
        this.failJob(jobId, "A required job dependency is not registered.");
        return false;
      }
      if (dependency.status === "failed" || dependency.status === "cancelled") {
        visiting.delete(jobId);
        this.failJob(jobId, "A required job dependency did not complete.");
        return false;
      }
      if (
        dependency.status === "scheduled" &&
        Date.parse(dependency.next_run_at) <= this.now() &&
        !(await this.runJob(dependencyId, visiting, completed))
      ) {
        visiting.delete(jobId);
        this.failJob(jobId, "A required job dependency did not complete.");
        return false;
      }
    }
    visiting.delete(jobId);

    const current = this.jobs.get(jobId);
    if (!current || current.status !== "scheduled") return false;
    const group = current.definition.concurrency_group;
    if (this.groups.has(group)) return false;
    const controller = new AbortController();
    this.running.set(jobId, controller);
    this.groups.add(group);
    this.jobs.set(jobId, { ...current, status: "running" });
    this.persist();
    this.options.logger?.info("job.started", {
      job_id: jobId,
      priority: current.definition.priority,
      concurrency_group: group,
    });
    try {
      await this.options.runner(current.definition, controller.signal);
      const latest = this.jobs.get(jobId);
      if (!latest) return false;
      if (controller.signal.aborted || latest.status === "cancelled") {
        this.jobs.set(jobId, {
          ...latest,
          status: "scheduled",
          next_run_at: new Date(this.nextOccurrence(latest.definition, this.now())).toISOString(),
        });
        this.persist();
        return false;
      }
      const next = nextStateAfterSuccess(latest, this.now(), this.nextOccurrence.bind(this));
      this.jobs.set(jobId, next);
      completed.add(jobId);
      this.persist();
      this.options.logger?.info("job.completed", {
        job_id: jobId,
        status: next.status,
        next_run_at: next.next_run_at,
      });
      return true;
    } catch {
      this.failJob(jobId, "Job runner failed.");
      return false;
    } finally {
      this.running.delete(jobId);
      this.groups.delete(group);
    }
  }

  private failJob(jobId: string, message: string): void {
    const state = this.jobs.get(jobId);
    if (!state) return;
    this.jobs.set(jobId, { ...state, status: "failed", last_error: message });
    this.persist();
    this.options.logger?.warning("job.failed", { job_id: jobId, reason: message });
  }

  private initialOccurrence(definition: JobDefinition, fromMs: number): number {
    return definition.type === "recurring" ? fromMs : this.nextOccurrence(definition, fromMs);
  }

  private nextOccurrence(definition: JobDefinition, fromMs: number): number {
    if (definition.type === "recurring") return fromMs + parseInterval(definition.schedule);
    if (definition.type === "delayed") return Date.parse(definition.schedule);
    return nextCronOccurrence(definition.schedule, fromMs);
  }

  private persist(): void {
    this.store.save([...this.jobs.values()].map(clone));
  }

  private failure(message: string): ErrorInfo {
    return { code: "NOVA-TL004", message, retryable: false };
  }
}

function nextStateAfterSuccess(
  state: JobState,
  now: number,
  nextOccurrence: (definition: JobDefinition, fromMs: number) => number,
): JobState {
  const lastRun = new Date(now).toISOString();
  if (state.definition.type === "delayed") {
    return { ...state, last_run_at: lastRun, status: "completed", next_run_at: lastRun };
  }
  return {
    definition: state.definition,
    last_run_at: lastRun,
    status: "scheduled",
    next_run_at: new Date(nextOccurrence(state.definition, now)).toISOString(),
  };
}

function validateDefinition(definition: JobDefinition): Result<void> {
  if (definition.job_id.trim().length === 0)
    return err({ code: "NOVA-TL004", message: "Job identifier is required.", retryable: false });
  if (!["recurring", "cron", "delayed"].includes(definition.type))
    return err({ code: "NOVA-TL004", message: "Job type is invalid.", retryable: false });
  if (definition.dependencies.some((dependency) => dependency.trim().length === 0))
    return err({
      code: "NOVA-TL004",
      message: "Job dependency identifiers are required.",
      retryable: false,
    });
  if (definition.concurrency_group.trim().length === 0)
    return err({
      code: "NOVA-TL004",
      message: "Job concurrency group is required.",
      retryable: false,
    });
  if (definition.type === "recurring") {
    try {
      parseInterval(definition.schedule);
    } catch {
      return err({
        code: "NOVA-TL004",
        message: "Recurring job interval is invalid.",
        retryable: false,
      });
    }
  }
  if (definition.type === "cron") {
    try {
      nextCronOccurrence(definition.schedule, Date.now());
    } catch {
      return err({ code: "NOVA-TL004", message: "Cron schedule is invalid.", retryable: false });
    }
  }
  if (definition.type === "delayed" && !Number.isFinite(Date.parse(definition.schedule)))
    return err({
      code: "NOVA-TL004",
      message: "Delayed job datetime is invalid.",
      retryable: false,
    });
  return ok(undefined);
}

function parseInterval(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/u.exec(value.trim());
  if (!match) throw new Error("Invalid interval.");
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === "s" ? 1_000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  const result = amount * multiplier;
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error("Invalid interval.");
  return result;
}

function nextCronOccurrence(expression: string, fromMs: number): number {
  const fields = expression.trim().split(/\s+/u);
  if (fields.length !== 5) throw new Error("Cron requires five fields.");
  const parsedFields = fields.map(parseCronField);
  const minute = parsedFields[0];
  const hour = parsedFields[1];
  const day = parsedFields[2];
  const month = parsedFields[3];
  const weekday = parsedFields[4];
  if (!minute || !hour || !day || !month || !weekday) throw new Error("Cron fields are invalid.");
  const start = new Date(fromMs);
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(start.getUTCMinutes() + 1);
  for (let offset = 0; offset < 366 * 24 * 60; offset += 1) {
    const candidate = new Date(start.getTime() + offset * 60_000);
    if (
      minute.has(candidate.getUTCMinutes()) &&
      hour.has(candidate.getUTCHours()) &&
      day.has(candidate.getUTCDate()) &&
      month.has(candidate.getUTCMonth() + 1) &&
      weekday.has(candidate.getUTCDay())
    )
      return candidate.getTime();
  }
  throw new Error("Cron has no occurrence in the supported horizon.");
}

function parseCronField(value: string): ReadonlySet<number> {
  const values = new Set<number>();
  for (const part of value.split(",")) {
    const [rawStart, rawEnd] = part.split("-");
    const start = rawStart === "*" ? 0 : Number(rawStart);
    const end = rawEnd === undefined ? start : rawEnd === "*" ? 59 : Number(rawEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start)
      throw new Error("Cron field is invalid.");
    for (let item = start; item <= end; item += 1) values.add(item);
  }
  if (values.size === 0) throw new Error("Cron field is empty.");
  return values;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
