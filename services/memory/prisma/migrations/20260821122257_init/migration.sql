-- CreateTable
CREATE TABLE "working_memory_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "content_ref" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "content_checksum" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "recent_memory_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "source_task_id" TEXT NOT NULL,
    "content_ref" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "schema_version" TEXT NOT NULL,
    "content_checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "superseded_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "long_term_memory_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "content_ref" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "verified_at" DATETIME NOT NULL,
    "source_lineage_id" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "content_checksum" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "working_memory_entries_workspace_id_task_id_idx" ON "working_memory_entries"("workspace_id", "task_id");

-- CreateIndex
CREATE INDEX "recent_memory_entries_workspace_id_identity_id_created_at_idx" ON "recent_memory_entries"("workspace_id", "identity_id", "created_at");

-- CreateIndex
CREATE INDEX "recent_memory_entries_superseded_by_id_idx" ON "recent_memory_entries"("superseded_by_id");

-- CreateIndex
CREATE INDEX "long_term_memory_entries_workspace_id_identity_id_verified_at_idx" ON "long_term_memory_entries"("workspace_id", "identity_id", "verified_at");

-- CreateIndex
CREATE INDEX "long_term_memory_entries_source_lineage_id_idx" ON "long_term_memory_entries"("source_lineage_id");
