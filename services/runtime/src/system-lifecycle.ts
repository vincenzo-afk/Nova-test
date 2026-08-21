import { err, ok, type Result, type ShutdownStep, type StartupStep } from "@nova/shared";

export interface LifecycleStep<TName extends string> {
  readonly name: TName;
  readonly run: () => Promise<Result<void>>;
}

export class SystemLifecycleOrchestrator {
  private readonly startupSteps: readonly LifecycleStep<StartupStep>[];
  private readonly shutdownSteps: readonly LifecycleStep<ShutdownStep>[];
  private readonly startupEntries: StartupStep[] = [];
  private readonly shutdownEntries: ShutdownStep[] = [];

  constructor(
    startupSteps: readonly LifecycleStep<StartupStep>[],
    shutdownSteps: readonly LifecycleStep<ShutdownStep>[] = [],
  ) {
    this.startupSteps = startupSteps;
    this.shutdownSteps = shutdownSteps;
  }

  async start(): Promise<Result<void>> {
    return this.runSteps(this.startupSteps, this.startupEntries);
  }

  async stop(): Promise<Result<void>> {
    return this.runSteps(this.shutdownSteps, this.shutdownEntries);
  }

  startupLog(): readonly StartupStep[] {
    return [...this.startupEntries];
  }

  shutdownLog(): readonly ShutdownStep[] {
    return [...this.shutdownEntries];
  }

  private async runSteps<TName extends string>(
    steps: readonly LifecycleStep<TName>[],
    log: TName[],
  ): Promise<Result<void>> {
    for (const step of steps) {
      const result = await step.run();
      if (!result.ok) {
        return err(result.error);
      }
      log.push(step.name);
    }
    return ok(undefined);
  }
}
