import { err, ok, type ErrorInfo, type Result, type StructuredLogger } from "@nova/shared";
import type { JobDefinition, JobScheduler, JobState } from "./job-scheduler.js";

export type BriefingTrigger = "time-based" | "event-based" | "explicit-request";

export interface BriefingItem {
  readonly title: string;
  readonly summary: string;
  readonly source_id: string;
  readonly requires_confirmation: boolean;
}

export interface Briefing {
  readonly trigger: BriefingTrigger;
  readonly items: readonly BriefingItem[];
}

export interface BriefingSource {
  readonly source_id: string;
  readonly collect: () => Promise<readonly BriefingItem[]>;
}

export interface ProactiveDestination {
  readonly deliver: (briefing: Briefing) => Promise<void>;
}

export interface BackgroundAssistantOptions {
  readonly enabled: boolean;
  readonly logger?: StructuredLogger;
}

export class BackgroundAssistant {
  public constructor(
    private readonly sources: readonly BriefingSource[],
    private readonly destination: ProactiveDestination,
    private readonly options: BackgroundAssistantOptions,
  ) {}

  public registerScheduledBriefing(
    scheduler: JobScheduler,
    definition: JobDefinition,
  ): Result<JobState> {
    if (!this.options.enabled)
      return err({
        code: "NOVA-AI002",
        message: "Proactive briefings are disabled.",
        retryable: false,
      });
    return scheduler.register(definition, async (_job, signal) => {
      if (signal.aborted) return;
      const briefing = await this.generate("time-based");
      if (!briefing.ok) throw new Error(briefing.error.message);
      if (signal.aborted) return;
      const delivered = await this.deliver(briefing.value);
      if (!delivered.ok) throw new Error(delivered.error.message);
    });
  }

  public async generate(trigger: BriefingTrigger): Promise<Result<Briefing>> {
    if (!this.options.enabled) return ok({ trigger, items: [] });
    try {
      const collected = await Promise.all(this.sources.map((source) => source.collect()));
      const items = collected.flat().map((item) => ({ ...item }));
      this.options.logger?.info("background.briefing.generated", {
        trigger,
        source_count: this.sources.length,
        item_count: items.length,
      });
      return ok({ trigger, items });
    } catch {
      return err(this.error("Background briefing collection failed."));
    }
  }

  public async deliver(briefing: Briefing): Promise<Result<void>> {
    if (!this.options.enabled) return ok(undefined);
    try {
      await this.destination.deliver(briefing);
      this.options.logger?.info("background.briefing.delivered", {
        trigger: briefing.trigger,
        item_count: briefing.items.length,
      });
      return ok(undefined);
    } catch {
      return err({
        code: "NOVA-AI002",
        message: "Configured proactive destination failed.",
        retryable: true,
      });
    }
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-AI002", message, retryable: true };
  }
}
