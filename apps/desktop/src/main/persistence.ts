import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { MemoryStore, TaskCheckpointStore, PrismaClient } from "@nova/memory";

const WORKSPACE_FILE = "workspace.json";
const WORKSPACE_SCHEMA_VERSION = "1.0.0";
const MIGRATION_TABLE = "_nova_desktop_migrations";

interface WorkspaceMetadata {
  readonly schema_version: typeof WORKSPACE_SCHEMA_VERSION;
  readonly workspace_id: string;
}

export interface DesktopPersistenceOptions {
  readonly userDataPath: string;
  readonly migrationsPath: string;
}

export interface DesktopPersistence {
  readonly databasePath: string;
  readonly workspaceId: string;
  readonly checkpointStore: TaskCheckpointStore;
  readonly memoryStore: MemoryStore;
  close(): Promise<void>;
}

export async function openDesktopPersistence(
  options: DesktopPersistenceOptions,
): Promise<DesktopPersistence> {
  const memoryPath = join(options.userDataPath, "memory", "structured");
  await mkdir(memoryPath, { recursive: true });
  const workspaceId = await loadOrCreateWorkspaceId(options.userDataPath);
  const databasePath = join(memoryPath, "nova.db");
  const client = new PrismaClient({
    datasources: { db: { url: pathToFileURL(databasePath).toString() } },
  });

  try {
    await applyMigrations(client, options.migrationsPath);
    return {
      databasePath,
      workspaceId,
      checkpointStore: new TaskCheckpointStore(client, workspaceId),
      memoryStore: new MemoryStore(client, workspaceId),
      close: () => client.$disconnect(),
    };
  } catch (cause) {
    await client.$disconnect();
    throw cause;
  }
}

async function loadOrCreateWorkspaceId(userDataPath: string): Promise<string> {
  const workspacePath = join(userDataPath, WORKSPACE_FILE);
  try {
    const metadata = JSON.parse(
      await readFile(workspacePath, "utf8"),
    ) as Partial<WorkspaceMetadata>;
    if (
      metadata.schema_version !== WORKSPACE_SCHEMA_VERSION ||
      typeof metadata.workspace_id !== "string" ||
      metadata.workspace_id.length === 0
    ) {
      throw new Error("The persisted Nova workspace metadata is invalid.");
    }
    return metadata.workspace_id;
  } catch (cause) {
    if (isFileNotFound(cause)) {
      const metadata: WorkspaceMetadata = {
        schema_version: WORKSPACE_SCHEMA_VERSION,
        workspace_id: randomUUID(),
      };
      const temporaryPath = `${workspacePath}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(metadata)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await rename(temporaryPath, workspacePath);
      return metadata.workspace_id;
    }
    throw cause;
  }
}

async function applyMigrations(client: PrismaClient, migrationsPath: string): Promise<void> {
  await client.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${MIGRATION_TABLE}" ("name" TEXT NOT NULL PRIMARY KEY, "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  );
  const applied = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT "name" FROM "${MIGRATION_TABLE}" ORDER BY "name" ASC`,
  );
  const appliedNames = new Set(applied.map((migration) => migration.name));
  let migrationEntries;
  try {
    migrationEntries = await readdir(migrationsPath, { withFileTypes: true });
  } catch (cause) {
    if (isFileNotFound(cause)) throw new Error("No Nova database migrations were found.");
    throw cause;
  }
  const entries = migrationEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (entries.length === 0) throw new Error("No Nova database migrations were found.");

  for (const name of entries) {
    if (appliedNames.has(name)) continue;
    const migration = await readFile(join(migrationsPath, name, "migration.sql"), "utf8");
    const statements = migration
      .split(";")
      .map((statement) => statement.replace(/^\s*--[^\n]*\n/gm, "").trim())
      .filter((statement) => statement.length > 0);
    if (statements.length === 0) throw new Error(`Migration ${name} contains no SQL statements.`);
    await client.$transaction(async (transaction) => {
      for (const statement of statements) await transaction.$executeRawUnsafe(statement);
      await transaction.$executeRawUnsafe(
        `INSERT INTO "${MIGRATION_TABLE}" ("name") VALUES (?)`,
        name,
      );
    });
  }
}

function isFileNotFound(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT";
}
