import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface EmailMessage {
  readonly id: string;
  readonly sender: string;
  readonly subject: string;
  readonly body: string;
  readonly attachments: readonly unknown[];
}

export interface EmailQuery {
  readonly from?: string;
  readonly subject?: string;
}

export interface EmailDraft {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

export interface EmailSendReceipt extends EmailDraft {
  readonly message_id: string;
}

export interface EmailProvider {
  readonly read: (query: EmailQuery) => Promise<readonly EmailMessage[]>;
  readonly send: (draft: EmailDraft) => Promise<EmailSendReceipt>;
}

export interface EmailAutomationRule {
  readonly to: string;
  readonly subject: string;
}

export class EmailAssistant {
  private readonly automationRules: EmailAutomationRule[] = [];

  public constructor(private readonly provider: EmailProvider) {}

  public async read(query: EmailQuery): Promise<Result<readonly EmailMessage[]>> {
    try {
      return ok(await this.provider.read(query));
    } catch {
      return err({ code: "NOVA-AI002", message: "Email provider read failed.", retryable: true });
    }
  }

  public draft(input: EmailDraft): Result<EmailDraft> {
    if (!input.to || !input.subject || !input.body)
      return err(this.validationError("Email drafts require recipient, subject, and body."));
    return ok({ ...input });
  }

  public async send(draft: EmailDraft, confirmed: boolean): Promise<Result<EmailSendReceipt>> {
    const automationAllowed = this.automationRules.some(
      (rule) => rule.to === draft.to && rule.subject === draft.subject,
    );
    if (!confirmed && !automationAllowed)
      return err(this.securityError("Sending email requires explicit confirmation."));
    try {
      return ok(await this.provider.send(draft));
    } catch {
      return err({ code: "NOVA-AI002", message: "Email provider send failed.", retryable: true });
    }
  }

  public addAutomationRule(rule: EmailAutomationRule): void {
    this.automationRules.push({ ...rule });
  }

  private validationError(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
