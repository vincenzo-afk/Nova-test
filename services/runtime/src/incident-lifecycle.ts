import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type IncidentStage = "Detected" | "Triaged" | "Mitigated" | "Resolved" | "Postmortem";
export type IncidentSeverity = "Low" | "Medium" | "High" | "Critical";

export interface IncidentEntry {
  readonly incident_id: string;
  readonly stage: IncidentStage;
  readonly owner: string;
  readonly timestamp: number;
  readonly detail: string;
  readonly severity?: IncidentSeverity;
}

export interface IncidentOptions {
  readonly owner: string;
  readonly now?: () => number;
}

export class IncidentManager {
  private readonly timelines = new Map<string, IncidentEntry[]>();
  private nextId = 1;

  public constructor(private readonly options: IncidentOptions) {}

  public detect(detail: string): Result<IncidentEntry> {
    const incidentId = `inc-${this.nextId++}`;
    const entry = this.entry(incidentId, "Detected", detail);
    this.timelines.set(incidentId, [entry]);
    return ok(entry);
  }

  public triage(incidentId: string, severity: IncidentSeverity): Result<IncidentEntry> {
    return this.transition(incidentId, "Detected", "Triaged", `severity:${severity}`, severity);
  }

  public mitigate(incidentId: string, detail: string): Result<IncidentEntry> {
    return this.transition(incidentId, "Triaged", "Mitigated", detail);
  }

  public resolve(incidentId: string, detail: string): Result<IncidentEntry> {
    return this.transition(incidentId, "Mitigated", "Resolved", detail);
  }

  public postmortem(incidentId: string, detail: string): Result<IncidentEntry> {
    return this.transition(incidentId, "Resolved", "Postmortem", detail);
  }

  public timeline(incidentId: string): readonly IncidentEntry[] {
    return [...(this.timelines.get(incidentId) ?? [])];
  }

  private transition(
    incidentId: string,
    expected: IncidentStage,
    stage: IncidentStage,
    detail: string,
    severity?: IncidentSeverity,
  ): Result<IncidentEntry> {
    const timeline = this.timelines.get(incidentId);
    if (!timeline || timeline.at(-1)?.stage !== expected)
      return err(this.error("Incident stage transition is invalid."));
    const entry = this.entry(incidentId, stage, detail, severity);
    timeline.push(entry);
    return ok(entry);
  }

  private entry(
    incidentId: string,
    stage: IncidentStage,
    detail: string,
    severity?: IncidentSeverity,
  ): IncidentEntry {
    return {
      incident_id: incidentId,
      stage,
      owner: this.options.owner,
      timestamp: this.options.now?.() ?? Date.now(),
      detail,
      ...(severity ? { severity } : {}),
    };
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-EVT002", message, retryable: false };
  }
}
