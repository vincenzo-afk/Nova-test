import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

const MAX_TIMEOUT_MS = 300_000;
const TIMEOUT_SENTINEL = Symbol("mcp-tool-timeout");

export class McpToolCallTimeout {
  public async run<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
  ): Promise<Result<T>> {
    if (!isTimeoutBudget(timeoutMs)) {
      return err({
        code: "NOVA-CFG001",
        message: "MCP tool timeout budget is invalid.",
        retryable: false,
      });
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
      timer = setTimeout(() => {
        resolve(TIMEOUT_SENTINEL);
        controller.abort();
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(controller.signal), timeout]);
      if (result === TIMEOUT_SENTINEL) {
        return err(this.timeoutError(timeoutMs));
      }
      return ok(result as T);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private timeoutError(timeoutMs: number): ErrorInfo {
    return {
      code: "NOVA-TL001",
      message: "MCP tool call timed out.",
      retryable: true,
      details: { timeout_ms: timeoutMs },
    };
  }
}

function isTimeoutBudget(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_TIMEOUT_MS
  );
}
