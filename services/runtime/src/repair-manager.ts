import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface RepairIssue {
  readonly issue_id: string;
  readonly kind: string;
  readonly safe: boolean;
}

export interface RepairOperations {
  readonly inspect: () => Promise<readonly RepairIssue[]>;
  readonly fix: (issueId: string) => Promise<unknown>;
}

export interface RepairRequest {
  readonly apply: boolean;
}

export interface RepairResult {
  readonly applied: readonly string[];
  readonly reported: readonly RepairIssue[];
}

export class RepairManager {
  public constructor(private readonly operations: RepairOperations) {}

  public async repair(request: RepairRequest = { apply: false }): Promise<Result<RepairResult>> {
    let issues: readonly RepairIssue[];
    try {
      issues = await this.operations.inspect();
    } catch {
      return err(this.error("Repair inspection failed."));
    }
    const applied: string[] = [];
    const reported: RepairIssue[] = [];
    for (const issue of issues) {
      if (!request.apply || !issue.safe) {
        reported.push(issue);
        continue;
      }
      try {
        await this.operations.fix(issue.issue_id);
        applied.push(issue.issue_id);
      } catch {
        reported.push(issue);
      }
    }
    return ok({ applied, reported });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-EVT002", message, retryable: true };
  }
}
