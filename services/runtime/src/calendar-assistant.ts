import type { StructuredLogger } from "@nova/shared";

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

export interface CalendarAssistantOptions {
  readonly logger?: StructuredLogger;
}

export class CalendarAssistant {
  private readonly logger: StructuredLogger | undefined;

  public constructor(
    private readonly providers: readonly CalendarProvider[],
    options: CalendarAssistantOptions = {},
  ) {
    this.logger = options.logger;
  }

  public async upcoming(): Promise<Result<readonly CalendarEvent[]>> {
    try {
      const events = (await Promise.all(this.providers.map((provider) => provider.list()))).flat();
      const ordered = [...events].sort((left, right) => left.start - right.start);
      this.logger?.info("calendar.read.completed", {
        provider_count: this.providers.length,
        event_count: ordered.length,
      });
      return ok(ordered);
    } catch {
      this.logger?.warning("calendar.read.failed", { reason: "provider_failure" });
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
    const conflicts = events.value.filter(
      (event) => event.start < draft.end && draft.start < event.end,
    );
    this.logger?.info("calendar.proposal.created", {
      conflict_count: conflicts.length,
      attendee_count: draft.attendees.length,
      owner: draft.owner,
    });
    return ok({ ...draft, conflicts });
  }

  public async create(draft: CalendarDraft, confirmed: boolean): Promise<Result<CalendarEvent>> {
    const proposal = await this.propose(draft);
    if (!proposal.ok) return proposal;
    const externalEffect = draft.attendees.length > 0 || !draft.owner;
    if (proposal.value.conflicts.length > 0) {
      this.logger?.warning("calendar.change.rejected", {
        reason: "conflict_detected",
        conflict_count: proposal.value.conflicts.length,
      });
      return err(this.securityError("Calendar event conflicts must be resolved before creation."));
    }
    if (externalEffect && !confirmed) {
      this.logger?.warning("calendar.change.rejected", {
        reason: "confirmation_required",
        external_effect: true,
      });
      return err(
        this.securityError("Calendar changes with external effects require confirmation."),
      );
    }
    const provider = this.providers[0];
    if (!provider) {
      this.logger?.warning("calendar.change.rejected", { reason: "provider_unconfigured" });
      return err({
        code: "NOVA-AI001",
        message: "No calendar provider is configured.",
        retryable: false,
      });
    }
    try {
      const event = await provider.create(draft);
      this.logger?.info("calendar.change.created", {
        external_effect: externalEffect,
        attendee_count: draft.attendees.length,
      });
      return ok(event);
    } catch {
      this.logger?.warning("calendar.change.failed", { reason: "provider_failure" });
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
