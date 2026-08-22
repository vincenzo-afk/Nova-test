-- CreateTable
CREATE TABLE "task_checkpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "checkpoint_status" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL,
    "step_history_json" TEXT NOT NULL,
    "waiting_user_reason" TEXT,
    "reason" TEXT,
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "task_checkpoints_workspace_id_task_id_created_at_idx" ON "task_checkpoints"("workspace_id", "task_id", "created_at");

-- CreateIndex
CREATE INDEX "task_checkpoints_workspace_id_checkpoint_status_created_at_idx" ON "task_checkpoints"("workspace_id", "checkpoint_status", "created_at");
