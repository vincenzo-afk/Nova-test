import { err, ok, type Result } from "@nova/shared";

const parse = (version: string): number[] =>
  version.split(".").map((part) => Number.parseInt(part, 10));

const compare = (left: string, right: string): number => {
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

export const MemoryVersioning = {
  isForwardOrEqual(currentVersion: string, targetVersion: string): boolean {
    return compare(currentVersion, targetVersion) <= 0;
  },

  assertForwardOrEqual(currentVersion: string, targetVersion: string): Result<void> {
    if (!this.isForwardOrEqual(currentVersion, targetVersion)) {
      return err({
        code: "NOVA-MEM001",
        message: `Memory schema version cannot decrease from ${currentVersion} to ${targetVersion}.`,
        retryable: false,
        details: { currentVersion, targetVersion },
      });
    }
    return ok(undefined);
  },
} as const;
