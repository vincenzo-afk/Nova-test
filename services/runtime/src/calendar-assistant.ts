import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly start: number;
  readonly end: number;
  readonly owner: boolean;
  readonly attendees: readonly string[];
}

export interface CalendarDraft {
  readonly title: string;
  readonly start: number;
  readonly end: number;
  readonly attendees: readonly string[];
  readonly owner: boolean;
}

export interface CalendarProvider {
  readonly calendar_id: string;
  readonly list: () => Promise<readonly CalendarEvent[]>;
  readonly create: (draft: CalendarDraft) => Promise<CalendarEvent>;
}

export interface CalendarProposal extends CalendarDraft {
  readonly conflicts: readonly CalendarEvent[];
}

export class CalendarAssistant {
  public constructor(private readonly providers: readonly CalendarProvider[]) {}

  public async upcoming(): Promise<Result<readonly CalendarEvent[]>> {
    try {
      const events = (await Promise.all(this.providers.map((provider) => provider.list()))).flat();
      return ok([...events].sort((left, right) => left.start - right.start));
    } catch {
      return err({
        code: "NOVA-AI002",
        message: "Calendar provider read failed.",
        retryable: true,
      });
    }
  }

  public async propose(draft: CalendarDraft): Promise<Result<CalendarProposal>> {
    const events = await this.upcoming();
    if (!events.ok) return events;
    return ok({
      ...draft,
      conflicts: events.value.filter((event) => event.start < draft.end && draft.start < event.end),
    });
  }

  public async create(draft: CalendarDraft, confirmed: boolean): Promise<Result<CalendarEvent>> {
    const proposal = await this.propose(draft);
    if (!proposal.ok) return proposal;
    const externalEffect = draft.attendees.length > 0 || !draft.owner;
    if (proposal.value.conflicts.length > 0)
      return err(this.securityError("Calendar event conflicts must be resolved before creation."));
    if (externalEffect && !confirmed)
      return err(
        this.securityError("Calendar changes with external effects require confirmation."),
      );
    const provider = this.providers[0];
    if (!provider)
      return err({
        code: "NOVA-AI001",
        message: "No calendar provider is configured.",
        retryable: false,
      });
    try {
      return ok(await provider.create(draft));
    } catch {
      return err({
        code: "NOVA-AI002",
        message: "Calendar provider create failed.",
        retryable: true,
      });
    }
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
