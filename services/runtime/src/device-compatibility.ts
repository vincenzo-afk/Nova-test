export type CompatibilityMode = "full" | "degraded" | "incompatible";

export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly mode: CompatibilityMode;
}

export function compareDeviceVersions(left: string, right: string): CompatibilityResult {
  const first = parseVersion(left);
  const second = parseVersion(right);
  if (!first || !second || first.major !== second.major || first.major < 5)
    return { compatible: false, mode: "incompatible" };
  if (first.minor === second.minor && first.patch === second.patch)
    return { compatible: true, mode: "full" };
  return { compatible: true, mode: "degraded" };
}

export interface LogicalClockValue {
  readonly counter: number;
  readonly device_id: string;
}

export class LogicalClock {
  private counter = 0;

  public constructor(private readonly device_id: string) {}

  public tick(): LogicalClockValue {
    this.counter += 1;
    return { counter: this.counter, device_id: this.device_id };
  }

  public observe(remote: LogicalClockValue): LogicalClockValue {
    this.counter = Math.max(this.counter, remote.counter) + 1;
    return { counter: this.counter, device_id: this.device_id };
  }

  public static compare(left: LogicalClockValue, right: LogicalClockValue): number {
    if (left.counter !== right.counter) return left.counter - right.counter;
    return left.device_id.localeCompare(right.device_id);
  }
}

function parseVersion(value: string): { major: number; minor: number; patch: number } | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}
