import {
  err,
  ok,
  windowPolicy,
  type Result,
  type StateObservation,
  type StateQuery,
  type StateResolution,
} from "@nova/shared";

const observationShape = {
  entityRef: "entityRef",
  value: "value",
  observer: "observer",
  observedAt: "observedAt",
  confidence: "confidence",
  corroborated: "corroborated",
} as const;

type ActiveRecheck<TValue> = (entityRef: string) => Promise<TValue>;

export class StateManager<TValue = unknown> {
  private readonly observations = new Map<string, StateObservation<TValue>[]>();

  constructor(private readonly activeRecheck?: ActiveRecheck<TValue>) {}

  observe(observation: StateObservation<TValue>): Result<void> {
    if (
      observation.entityRef.length === 0 ||
      observation.observer.length === 0 ||
      !Number.isFinite(observation.confidence) ||
      observation.confidence < 0 ||
      observation.confidence > 1 ||
      Number.isNaN(Date.parse(observation.observedAt))
    ) {
      return err({
        code: "NOVA-CFG001",
        message: "Observation failed State Manager validation.",
        retryable: false,
        details: { invalidField: observationShape.confidence },
      });
    }

    const existing = this.observations.get(observation.entityRef) ?? [];
    existing.push(observation);
    existing.sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt));
    this.observations.set(observation.entityRef, existing);
    return ok(undefined);
  }

  async query(query: StateQuery): Promise<Result<StateResolution<TValue>>> {
    const entityObservations = this.observations.get(query.entityRef);
    const latest = entityObservations?.at(-1);
    if (!latest || !entityObservations) {
      return err({
        code: "NOVA-CFG001",
        message: `No observation exists for entity ${query.entityRef}.`,
        retryable: false,
        details: { entityRef: query.entityRef },
      });
    }

    const contradictionPending = entityObservations.some((candidate) => {
      if (candidate === latest || candidate.observer === latest.observer) {
        return false;
      }
      const ageMs = Math.abs(Date.parse(latest.observedAt) - Date.parse(candidate.observedAt));
      return (
        ageMs <= windowPolicy.crossObserverConflictMs &&
        !Object.is(candidate.value, latest.value) &&
        JSON.stringify(candidate.value) !== JSON.stringify(latest.value)
      );
    });

    if (contradictionPending && query.allowActiveRecheck && this.activeRecheck) {
      const value = await this.activeRecheck(query.entityRef);
      return ok({
        value,
        confidence: latest.confidence,
        resolvedAt: new Date().toISOString(),
        contradictionPending: false,
      });
    }

    return ok({
      value: latest.value,
      confidence: latest.confidence,
      resolvedAt: new Date().toISOString(),
      contradictionPending,
    });
  }
}
