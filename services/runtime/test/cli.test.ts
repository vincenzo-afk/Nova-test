import { describe, expect, it } from "vitest";
import { NovaCli } from "../src/cli.js";

describe("NovaCli", () => {
  it("generates help from its command registry", async () => {
    const cli = new NovaCli({ version: "0.1.0" });
    const result = await cli.run(["--help"]);

    expect(result).toMatchObject({
      ok: true,
      value: {
        command: "help",
        commands: expect.arrayContaining([
          "init",
          "doctor",
          "diagnostics",
          "clean",
          "config",
          "env",
        ]),
      },
    });
  });

  it("returns versioned JSON doctor output", async () => {
    const cli = new NovaCli({
      version: "0.1.0",
      health: async () => ({ runtime: "healthy", memory: "healthy" }),
    });

    const result = await cli.run(["doctor", "--json"]);

    expect(result).toMatchObject({
      ok: true,
      value: {
        schema_version: "1.0.0",
        command: "doctor",
        status: "ok",
        data: { runtime: "healthy" },
      },
    });
  });

  it("keeps destructive clean dry-run by default and requires explicit apply", async () => {
    const cli = new NovaCli({ version: "0.1.0" });

    expect(await cli.run(["clean", "--json"])).toMatchObject({
      ok: true,
      value: { command: "clean", data: { dry_run: true } },
    });
    expect(await cli.run(["clean", "--apply", "--json"])).toMatchObject({
      ok: true,
      value: { command: "clean", data: { dry_run: false } },
    });
  });

  it("rejects unknown commands with a structured error", async () => {
    const cli = new NovaCli({ version: "0.1.0" });

    expect(await cli.run(["unknown", "--json"])).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
  });
});
