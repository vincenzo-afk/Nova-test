import { readFile } from "node:fs/promises";

export interface UpdateChangelogEntry {
  readonly version: string;
  readonly date: string;
}

export interface UpdateInfo {
  readonly checked_at: string;
  readonly current_version: string;
  readonly latest_version: string | null;
  readonly update_available: boolean;
  readonly rollback_available: boolean;
  readonly update_service: "not_configured";
  readonly changelog: readonly UpdateChangelogEntry[];
  readonly partial: boolean;
}

const DEFAULT_MAX_ENTRIES = 10;
const MAX_ENTRIES = 100;
const CHANGELOG_ENTRY = /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})$/gm;

export async function readUpdateInfo(
  packagePath: string,
  changelogPath: string,
  maxEntries = DEFAULT_MAX_ENTRIES,
): Promise<UpdateInfo> {
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > MAX_ENTRIES) {
    throw new Error(`Changelog entry limit must be an integer from 1 to ${MAX_ENTRIES}.`);
  }

  let partial = false;
  let currentVersion = "unknown";
  try {
    const packageData = JSON.parse(await readFile(packagePath, "utf8")) as unknown;
    if (
      typeof packageData === "object" &&
      packageData !== null &&
      "version" in packageData &&
      typeof packageData.version === "string" &&
      packageData.version.length > 0
    ) {
      currentVersion = packageData.version;
    } else {
      partial = true;
    }
  } catch (cause) {
    if (!isFileNotFound(cause)) throw cause;
    partial = true;
  }

  let changelog = "";
  try {
    changelog = await readFile(changelogPath, "utf8");
  } catch (cause) {
    if (!isFileNotFound(cause)) throw cause;
    partial = true;
  }

  const entries: UpdateChangelogEntry[] = [];
  for (const match of changelog.matchAll(CHANGELOG_ENTRY)) {
    const version = match[1];
    const date = match[2];
    if (version !== undefined && date !== undefined) entries.push({ version, date });
    if (entries.length >= maxEntries) break;
  }

  return {
    checked_at: new Date().toISOString(),
    current_version: currentVersion,
    latest_version: null,
    update_available: false,
    rollback_available: false,
    update_service: "not_configured",
    changelog: entries,
    partial,
  };
}

function isFileNotFound(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT";
}
