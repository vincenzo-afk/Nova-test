import { createHash, randomUUID } from "node:crypto";
import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { PrismaClient } from "./generated/index.js";

interface WorkingInput {
  readonly taskId: string;
  readonly contentRef: string;
  readonly schemaVersion: string;
}

interface RecentInput {
  readonly identityId: string;
  readonly sourceTaskId: string;
  readonly contentRef: string;
  readonly confidence: number;
  readonly schemaVersion: string;
}

interface RecentPromotionInput {
  readonly workingId: string;
  readonly identityId: string;
  readonly sourceTaskId: string;
  readonly confidence: number;
}

interface LongTermPromotionInput {
  readonly recentId: string;
  readonly verified: boolean;
}

export class MemoryStore {
  constructor(
    private readonly client: PrismaClient,
    private readonly workspaceId: string,
  ) {}

  async writeWorking(
    input: WorkingInput,
  ): Promise<Result<Awaited<ReturnType<PrismaClient["workingMemoryEntry"]["create"]>>>> {
    if (
      input.taskId.length === 0 ||
      input.contentRef.length === 0 ||
      input.schemaVersion.length === 0
    ) {
      return err(this.invalidInput("Working Memory input is incomplete."));
    }

    try {
      const row = await this.client.workingMemoryEntry.create({
        data: {
          id: randomUUID(),
          workspaceId: this.workspaceId,
          taskId: input.taskId,
          contentRef: input.contentRef,
          schemaVersion: input.schemaVersion,
          contentChecksum: checksum(input.contentRef),
        },
      });
      return ok(row);
    } catch (cause) {
      return err(this.storageError(cause));
    }
  }

  async writeRecent(
    input: RecentInput,
  ): Promise<Result<Awaited<ReturnType<PrismaClient["recentMemoryEntry"]["create"]>>>> {
    if (
      input.identityId.length === 0 ||
      input.sourceTaskId.length === 0 ||
      input.contentRef.length === 0 ||
      input.schemaVersion.length === 0 ||
      input.confidence < 0 ||
      input.confidence > 1
    ) {
      return err(this.invalidInput("Recent Memory input is invalid."));
    }

    try {
      const row = await this.client.recentMemoryEntry.create({
        data: {
          id: randomUUID(),
          workspaceId: this.workspaceId,
          identityId: input.identityId,
          sourceTaskId: input.sourceTaskId,
          contentRef: input.contentRef,
          confidence: input.confidence,
          schemaVersion: input.schemaVersion,
          contentChecksum: checksum(input.contentRef),
        },
      });
      return ok(row);
    } catch (cause) {
      return err(this.storageError(cause));
    }
  }

  async promoteWorkingToRecent(
    input: RecentPromotionInput,
  ): Promise<Result<Awaited<ReturnType<PrismaClient["recentMemoryEntry"]["create"]>>>> {
    if (input.confidence < 0 || input.confidence > 1) {
      return err(this.invalidInput("Recent Memory confidence must be between 0 and 1."));
    }

    try {
      const row = await this.client.$transaction(async (transaction) => {
        const working = await transaction.workingMemoryEntry.findFirst({
          where: { id: input.workingId, workspaceId: this.workspaceId },
        });
        if (!working) {
          throw new MemoryStoreFailure(
            "NOVA-MEM003",
            "Working Memory entry is outside this workspace.",
          );
        }

        return transaction.recentMemoryEntry.create({
          data: {
            id: randomUUID(),
            workspaceId: this.workspaceId,
            identityId: input.identityId,
            sourceTaskId: input.sourceTaskId,
            contentRef: working.contentRef,
            confidence: input.confidence,
            schemaVersion: working.schemaVersion,
            contentChecksum: working.contentChecksum,
          },
        });
      });
      return ok(row);
    } catch (cause) {
      return err(this.toError(cause));
    }
  }

  async promoteRecentToLongTerm(
    input: LongTermPromotionInput,
  ): Promise<Result<Awaited<ReturnType<PrismaClient["longTermMemoryEntry"]["create"]>>>> {
    if (!input.verified) {
      return err({
        code: "NOVA-TSK004",
        message: "Only independently verified memory can be promoted to Long-term Memory.",
        retryable: false,
      });
    }

    try {
      const row = await this.client.$transaction(async (transaction) => {
        const recent = await transaction.recentMemoryEntry.findFirst({
          where: { id: input.recentId, workspaceId: this.workspaceId },
        });
        if (!recent) {
          throw new MemoryStoreFailure(
            "NOVA-MEM003",
            "Recent Memory entry is outside this workspace.",
          );
        }

        return transaction.longTermMemoryEntry.create({
          data: {
            id: randomUUID(),
            workspaceId: this.workspaceId,
            identityId: recent.identityId,
            contentRef: recent.contentRef,
            confidence: recent.confidence,
            verifiedAt: new Date(),
            sourceLineageId: recent.id,
            schemaVersion: recent.schemaVersion,
            contentChecksum: recent.contentChecksum,
          },
        });
      });
      return ok(row);
    } catch (cause) {
      return err(this.toError(cause));
    }
  }

  async readRecent(
    id: string,
  ): Promise<Result<Awaited<ReturnType<PrismaClient["recentMemoryEntry"]["findFirst"]>>>> {
    try {
      const row = await this.client.recentMemoryEntry.findFirst({
        where: { id, workspaceId: this.workspaceId },
      });
      if (!row) {
        return err({
          code: "NOVA-MEM003",
          message: "Memory entry is not available in this workspace.",
          retryable: false,
          details: { id },
        });
      }
      if (checksum(row.contentRef) !== row.contentChecksum) {
        return err({
          code: "NOVA-MEM001",
          message: "Memory checksum mismatch detected.",
          retryable: false,
          details: { id },
        });
      }
      return ok(row);
    } catch (cause) {
      return err(this.storageError(cause));
    }
  }

  async supersedeRecent(oldId: string, replacementId: string): Promise<Result<void>> {
    try {
      await this.client.$transaction(async (transaction) => {
        const [oldEntry, replacement] = await Promise.all([
          transaction.recentMemoryEntry.findFirst({
            where: { id: oldId, workspaceId: this.workspaceId },
          }),
          transaction.recentMemoryEntry.findFirst({
            where: { id: replacementId, workspaceId: this.workspaceId },
          }),
        ]);
        if (!oldEntry || !replacement) {
          throw new MemoryStoreFailure(
            "NOVA-MEM003",
            "Supersession target is outside this workspace.",
          );
        }
        await transaction.recentMemoryEntry.update({
          where: { id: oldId },
          data: { status: "SUPERSEDED", supersededById: replacementId },
        });
      });
      return ok(undefined);
    } catch (cause) {
      return err(this.toError(cause));
    }
  }

  private invalidInput(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }

  private storageError(cause: unknown): ErrorInfo {
    return {
      code: "NOVA-MEM001",
      message: cause instanceof Error ? cause.message : "Memory storage operation failed.",
      retryable: true,
    };
  }

  private toError(cause: unknown): ErrorInfo {
    if (cause instanceof MemoryStoreFailure) {
      return { code: cause.code, message: cause.message, retryable: false };
    }
    return this.storageError(cause);
  }
}

class MemoryStoreFailure extends Error {
  constructor(
    readonly code: "NOVA-MEM003",
    message: string,
  ) {
    super(message);
  }
}

const checksum = (content: string): string => createHash("sha256").update(content).digest("hex");
