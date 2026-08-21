import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

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
}

export class BackgroundAssistant {
  public constructor(
    private readonly sources: readonly BriefingSource[],
    private readonly destination: ProactiveDestination,
    private readonly options: BackgroundAssistantOptions,
  ) {}

  public async generate(trigger: BriefingTrigger): Promise<Result<Briefing>> {
    if (!this.options.enabled) return ok({ trigger, items: [] });
    try {
      const collected = await Promise.all(this.sources.map((source) => source.collect()));
      const items = collected.flat().map((item) => ({ ...item }));
      return ok({ trigger, items });
    } catch {
      return err(this.error("Background briefing collection failed."));
    }
  }

  public async deliver(briefing: Briefing): Promise<Result<void>> {
    if (!this.options.enabled) return ok(undefined);
    try {
      await this.destination.deliver(briefing);
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
