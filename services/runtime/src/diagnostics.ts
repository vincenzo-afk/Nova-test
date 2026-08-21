export interface DiagnosticInputs {
  readonly config: unknown;
  readonly logs: readonly string[];
  readonly traces: readonly string[];
  readonly doctor: unknown;
  readonly env: unknown;
  readonly plugins: readonly unknown[];
  readonly tasks: readonly unknown[];
}

export interface DiagnosticBundle {
  readonly files: readonly string[];
  readonly contents: Readonly<Record<string, string>>;
}

export interface DiagnosticsOptions {
  readonly maxTasks?: number;
}

export class DiagnosticsCollector {
  public constructor(
    private readonly inputFactory: () => DiagnosticInputs,
    private readonly options: DiagnosticsOptions = {},
  ) {}

  public collect(): DiagnosticBundle {
    const input = this.inputFactory();
    const maxTasks = this.options.maxTasks ?? 10;
    const tasks = input.tasks.slice(-maxTasks).map((task) => redact(task));
    const contents: Record<string, string> = {
      "config.json": JSON.stringify(redact(input.config), null, 2),
      "logs.txt": input.logs.map((line) => redactString(line)).join("\n"),
      "traces.txt": input.traces.map((line) => redactString(line)).join("\n"),
      "doctor.json": JSON.stringify(redact(input.doctor), null, 2),
      "env.json": JSON.stringify(redact(input.env), null, 2),
      "plugins.json": JSON.stringify(redact(input.plugins), null, 2),
      "tasks.json": JSON.stringify(tasks, null, 2),
    };
    return { files: Object.keys(contents), contents };
  }
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "string") return redactString(value);
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (
      [
        "token",
        "secret",
        "password",
        "api_key",
        "apiKey",
        "credential_value",
        "pii",
        "email",
      ].includes(key)
    ) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redact(nested);
    }
  }
  return result;
}

function redactString(value: string): string {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
