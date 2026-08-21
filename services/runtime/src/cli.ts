import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface CliOptions {
  readonly version: string;
  readonly health?: () => Promise<Readonly<Record<string, string>>>;
}

export interface CliResponse {
  readonly schema_version: "1.0.0";
  readonly command: string;
  readonly status: "ok" | "error";
  readonly data: Readonly<Record<string, unknown>>;
}

const commandRegistry = ["init", "doctor", "diagnostics", "clean", "config", "env"] as const;

export class NovaCli {
  public constructor(private readonly options: CliOptions) {}

  public async run(
    argv: readonly string[],
  ): Promise<Result<CliResponse & { readonly commands?: readonly string[] }>> {
    const command = argv.find((argument) => !argument.startsWith("-"));
    const json = argv.includes("--json");
    if (argv.includes("--help") || command === undefined) {
      return ok({
        schema_version: "1.0.0",
        command: "help",
        status: "ok",
        data: { version: this.options.version },
        commands: commandRegistry,
      });
    }
    if (!commandRegistry.includes(command as (typeof commandRegistry)[number]))
      return err(this.error("Unknown NOVA command."));

    if (command === "doctor") {
      const data = this.options.health ? await this.options.health() : { runtime: "unknown" };
      return ok({
        schema_version: "1.0.0",
        command,
        status: "ok",
        data: { ...data, json_requested: json },
      });
    }
    if (command === "clean") {
      return ok({
        schema_version: "1.0.0",
        command,
        status: "ok",
        data: { dry_run: !argv.includes("--apply"), json_requested: json },
      });
    }
    if (command === "env") {
      return ok({
        schema_version: "1.0.0",
        command,
        status: "ok",
        data: { version: this.options.version },
      });
    }
    return ok({ schema_version: "1.0.0", command, status: "ok", data: { json_requested: json } });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}
