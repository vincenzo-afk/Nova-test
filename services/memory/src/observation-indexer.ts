import { err, ok, type MessageEnvelope, type Result } from "@nova/shared";

export type SupportedObservationTopic =
  | "observer.application.launched"
  | "observer.application.closed"
  | "observer.window.opened"
  | "observer.window.closed"
  | "observer.window.focused"
  | "observer.window.title_changed";

export interface SupportedObservationEvent extends Omit<MessageEnvelope, "topic"> {
  readonly topic: SupportedObservationTopic;
}

export interface ObservationMemoryWriter {
  writeWorking(input: {
    readonly taskId: string;
    readonly contentRef: string;
    readonly schemaVersion: string;
  }): Promise<Result<{ readonly id: string }>>;
}

export type ObservationIndexResult =
  | { readonly persisted: false; readonly reason: "no_task_context" }
  | { readonly persisted: true; readonly memory_id: string; readonly task_id: string };

export interface ObservationIndexRequest {
  readonly task_id?: string;
  readonly event: SupportedObservationEvent;
}

export class ObservationIndexer {
  public constructor(private readonly memory: ObservationMemoryWriter) {}

  public async index(request: ObservationIndexRequest): Promise<Result<ObservationIndexResult>> {
    if (request.task_id !== undefined && request.task_id.length === 0) {
      return err({
        code: "NOVA-TL002",
        message: "Observer indexing requires a non-empty task context when supplied.",
        retryable: false,
      });
    }
    const normalized = normalizeEvent(request.event);
    if (!normalized.ok) return normalized;
    if (request.task_id === undefined) return ok({ persisted: false, reason: "no_task_context" });

    const stored = await this.memory.writeWorking({
      taskId: request.task_id,
      contentRef: JSON.stringify(normalized.value),
      schemaVersion: request.event.schema_version,
    });
    if (!stored.ok) return stored;
    return ok({ persisted: true, memory_id: stored.value.id, task_id: request.task_id });
  }
}

function normalizeEvent(
  event: SupportedObservationEvent,
): Result<NormalizedObservation> | Result<never> {
  if (!supportedTopics.has(event.topic)) {
    return err({
      code: "NOVA-TL002",
      message: "Observer event is not eligible for Working Memory indexing.",
      retryable: false,
      details: { topic: event.topic },
    });
  }
  if (
    typeof event.schema_version !== "string" ||
    typeof event.timestamp !== "string" ||
    typeof event.correlation_id !== "string" ||
    typeof event.source_service !== "string"
  ) {
    return err({
      code: "NOVA-TL002",
      message: "Observer event envelope is malformed.",
      retryable: false,
    });
  }
  const payload = asRecord(event.payload);
  if (!payload) return invalidPayload();

  if (event.topic.startsWith("observer.application.")) {
    const application = asRecord(payload.application);
    if (!application) return invalidPayload();
    const processId = application.process_id;
    const applicationName = boundedString(application.application_name, 128);
    if (
      typeof processId !== "number" ||
      !Number.isInteger(processId) ||
      processId < 0 ||
      !applicationName
    ) {
      return invalidPayload();
    }
    return ok({
      topic: event.topic,
      schema_version: event.schema_version,
      timestamp: event.timestamp,
      correlation_id: event.correlation_id,
      source_service: event.source_service,
      application: { process_id: processId, application_name: applicationName },
    });
  }

  const window = asRecord(payload.window);
  if (!window) return invalidPayload();
  const processId = window.process_id;
  const applicationName = boundedString(window.application_name, 128);
  const title = boundedString(window.title, 200);
  const monitorId = boundedString(window.monitor_id, 128);
  const virtualDesktopId = boundedString(window.virtual_desktop_id, 128);
  const zOrder = window.z_order;
  if (
    typeof processId !== "number" ||
    !Number.isInteger(processId) ||
    processId < 0 ||
    !applicationName ||
    title === null ||
    !monitorId ||
    !virtualDesktopId ||
    typeof zOrder !== "number" ||
    !Number.isInteger(zOrder)
  ) {
    return invalidPayload();
  }
  return ok({
    topic: event.topic,
    schema_version: event.schema_version,
    timestamp: event.timestamp,
    correlation_id: event.correlation_id,
    source_service: event.source_service,
    window: {
      process_id: processId,
      application_name: applicationName,
      title,
      monitor_id: monitorId,
      virtual_desktop_id: virtualDesktopId,
      z_order: zOrder,
    },
  });
}

interface NormalizedObservation {
  readonly topic: SupportedObservationTopic;
  readonly schema_version: string;
  readonly timestamp: string;
  readonly correlation_id: string;
  readonly source_service: string;
  readonly application?: { readonly process_id: number; readonly application_name: string };
  readonly window?: {
    readonly process_id: number;
    readonly application_name: string;
    readonly title: string;
    readonly monitor_id: string;
    readonly virtual_desktop_id: string;
    readonly z_order: number;
  };
}

const supportedTopics = new Set<SupportedObservationTopic>([
  "observer.application.launched",
  "observer.application.closed",
  "observer.window.opened",
  "observer.window.closed",
  "observer.window.focused",
  "observer.window.title_changed",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  })
    .join("")
    .trim();
  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
}

function invalidPayload(): Result<never> {
  return err({
    code: "NOVA-TL002",
    message: "Observer event payload is malformed or outside the indexable metadata boundary.",
    retryable: false,
  });
}
