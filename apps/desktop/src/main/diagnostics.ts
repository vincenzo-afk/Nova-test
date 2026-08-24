import { readFile } from "node:fs/promises";
import type { LogLevel } from "@nova/shared";

export interface DiagnosticLogSummary {
  readonly timestamp: string;
  readonly service: string;
  readonly severity: LogLevel;
  readonly event: string;
  readonly correlation_id?: string;
}

export interface DiagnosticsSnapshot {
  readonly collected_at: string;
  readonly records: readonly DiagnosticLogSummary[];
  readonly partial: boolean;
}

const levels = new Set<LogLevel>(["debug", "info", "warning", "error", "critical"]);
const DEFAULT_MAX_RECORDS = 100;
const MAX_RECORDS = 10_000;

export async function readDiagnostics(
  path: string,
  maxRecords = DEFAULT_MAX_RECORDS,
): Promise<DiagnosticsSnapshot> {
  if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > MAX_RECORDS) {
    throw new Error(`Diagnostic record limit must be an integer from 1 to ${MAX_RECORDS}.`);
  }

  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (cause) {
    if (isFileNotFound(cause)) {
      return { collected_at: new Date().toISOString(), records: [], partial: false };
    }
    throw cause;
  }

  let partial = false;
  const records: DiagnosticLogSummary[] = [];
  for (const line of contents.split(/\r?\n/).filter((value) => value.length > 0)) {
    try {
      const parsed = JSON.parse(line) as unknown;
      const record = parseRecord(parsed);
      if (record) records.push(record);
      else partial = true;
    } catch {
      partial = true;
    }
  }

  return {
    collected_at: new Date().toISOString(),
    records: records.slice(-maxRecords),
    partial,
  };
}

function parseRecord(value: unknown): DiagnosticLogSummary | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (
    typeof record.timestamp !== "string" ||
    Number.isNaN(Date.parse(record.timestamp)) ||
    typeof record.service !== "string" ||
    record.service.length === 0 ||
    typeof record.event !== "string" ||
    record.event.length === 0 ||
    typeof record.severity !== "string" ||
    !levels.has(record.severity as LogLevel)
  ) {
    return undefined;
  }
  return {
    timestamp: record.timestamp,
    service: record.service,
    severity: record.severity as LogLevel,
    event: record.event,
    ...(typeof record.correlation_id === "string" ? { correlation_id: record.correlation_id } : {}),
  };
}

function isFileNotFound(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT";
}
