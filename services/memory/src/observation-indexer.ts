import { err, ok, type MessageEnvelope, type Result } from "@nova/shared";

export type SupportedObservationTopic =
  | "observer.application.launched"
  | "observer.application.closed"
  | "observer.window.opened"
  | "observer.window.closed"
  | "observer.window.focused"
  | "observer.window.title_changed"
  | "observer.clipboard.changed"
  | "observer.notification.received";

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

  if (event.topic === "observer.clipboard.changed") {
    return normalizeClipboardEvent(event, payload);
  }
  if (event.topic === "observer.notification.received") {
    return normalizeNotificationEvent(event, payload);
  }

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
  readonly clipboard?: {
    readonly content_type: "text" | "image" | "file_reference" | "unknown";
    readonly source_application: string;
    readonly capture_level: "metadata" | "content";
    readonly content_bytes: number;
    readonly content?: string;
    readonly excluded_reason?: string;
  };
  readonly notification?: {
    readonly source_application: string;
    readonly title: string;
    readonly capture_level: "metadata" | "content";
    readonly body_bytes: number;
    readonly body?: string;
    readonly excluded_reason?: string;
  };
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
  "observer.clipboard.changed",
  "observer.notification.received",
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

function normalizeClipboardEvent(
  event: SupportedObservationEvent,
  payload: Record<string, unknown>,
): Result<NormalizedObservation> {
  const contentType = payload.content_type;
  const sourceApplication = boundedString(payload.source_application, 160);
  const captureLevel = payload.capture_level;
  const contentBytes = payload.content_bytes;
  const excludedReason = payload.excluded_reason;
  if (
    (contentType !== "text" &&
      contentType !== "image" &&
      contentType !== "file_reference" &&
      contentType !== "unknown") ||
    !sourceApplication ||
    (captureLevel !== "metadata" && captureLevel !== "content") ||
    typeof contentBytes !== "number" ||
    !Number.isInteger(contentBytes) ||
    contentBytes < 0 ||
    contentBytes > 1_048_576 ||
    (excludedReason !== undefined && typeof excludedReason !== "string")
  ) {
    return invalidPayload();
  }

  const normalizedContentType = contentType as "text" | "image" | "file_reference" | "unknown";
  const normalizedCaptureLevel = captureLevel as "metadata" | "content";
  const baseClipboard = {
    content_type: normalizedContentType,
    source_application: sourceApplication,
    capture_level: normalizedCaptureLevel,
    content_bytes: contentBytes,
    ...(typeof excludedReason === "string" ? { excluded_reason: excludedReason } : {}),
  };
  const clipboard =
    captureLevel === "content"
      ? (() => {
          if (
            normalizedContentType !== "text" ||
            typeof payload.content !== "string" ||
            Buffer.byteLength(payload.content, "utf8") !== contentBytes ||
            contentBytes > 1_048_576 ||
            excludedReason === "sensitive_source"
          ) {
            return null;
          }
          return { ...baseClipboard, content: payload.content };
        })()
      : baseClipboard;
  if (clipboard === null) return invalidPayload();

  return ok({
    topic: event.topic,
    schema_version: event.schema_version,
    timestamp: event.timestamp,
    correlation_id: event.correlation_id,
    source_service: event.source_service,
    clipboard,
  });
}

function normalizeNotificationEvent(
  event: SupportedObservationEvent,
  payload: Record<string, unknown>,
): Result<NormalizedObservation> {
  const sourceApplication = boundedString(payload.source_application, 160);
  const title = boundedString(payload.title, 512);
  const captureLevel = payload.capture_level;
  const bodyBytes = payload.body_bytes;
  const excludedReason = payload.excluded_reason;
  if (
    !sourceApplication ||
    !title ||
    (captureLevel !== "metadata" && captureLevel !== "content") ||
    typeof bodyBytes !== "number" ||
    !Number.isInteger(bodyBytes) ||
    bodyBytes < 0 ||
    bodyBytes > 1_048_576 ||
    (excludedReason !== undefined && typeof excludedReason !== "string")
  ) {
    return invalidPayload();
  }

  const baseNotification = {
    source_application: sourceApplication,
    title,
    capture_level: captureLevel as "metadata" | "content",
    body_bytes: bodyBytes,
    ...(typeof excludedReason === "string" ? { excluded_reason: excludedReason } : {}),
  };
  const notification =
    captureLevel === "content"
      ? (() => {
          if (
            typeof payload.body !== "string" ||
            Buffer.byteLength(payload.body, "utf8") !== bodyBytes ||
            bodyBytes > 1_048_576 ||
            excludedReason === "sensitive_source"
          ) {
            return null;
          }
          return { ...baseNotification, body: payload.body };
        })()
      : baseNotification;
  if (notification === null) return invalidPayload();

  return ok({
    topic: event.topic,
    schema_version: event.schema_version,
    timestamp: event.timestamp,
    correlation_id: event.correlation_id,
    source_service: event.source_service,
    notification,
  });
}

function invalidPayload(): Result<never> {
  return err({
    code: "NOVA-TL002",
    message: "Observer event payload is malformed or outside the indexable metadata boundary.",
    retryable: false,
  });
}
