import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readUpdateInfo } from "../src/main/update-info.js";

describe("readUpdateInfo", () => {
  it("reads the current version and bounded changelog entries locally", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-updates-"));
    const packagePath = join(directory, "package.json");
    const changelogPath = join(directory, "CHANGELOG.md");
    await mkdir(directory, { recursive: true });
    await writeFile(packagePath, JSON.stringify({ version: "0.1.0" }), "utf8");
    await writeFile(
      changelogPath,
      "## [0.1.0] - 2026-08-21\n\n- First release\n\n## [0.0.9] - 2026-08-01\n\n- Previous release\n",
      "utf8",
    );

    const info = await readUpdateInfo(packagePath, changelogPath, 1);

    expect(info).toMatchObject({
      current_version: "0.1.0",
      latest_version: null,
      update_available: false,
      rollback_available: false,
      update_service: "not_configured",
      changelog: [{ version: "0.1.0", date: "2026-08-21" }],
    });
  });

  it("returns an explicit degraded state when local release metadata is missing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-updates-"));

    const info = await readUpdateInfo(
      join(directory, "package.json"),
      join(directory, "CHANGELOG.md"),
      5,
    );

    expect(info).toMatchObject({
      current_version: "unknown",
      latest_version: null,
      update_available: false,
      rollback_available: false,
      update_service: "not_configured",
      changelog: [],
      partial: true,
    });
  });
});
