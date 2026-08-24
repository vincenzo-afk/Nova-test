import type { StructuredLogger } from "@nova/shared";

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

export interface EmailAssistantOptions {
  readonly logger?: StructuredLogger;
}

export class EmailAssistant {
  private readonly automationRules: EmailAutomationRule[] = [];
  private readonly logger: StructuredLogger | undefined;

  public constructor(
    private readonly provider: EmailProvider,
    options: EmailAssistantOptions = {},
  ) {
    this.logger = options.logger;
  }

  public async read(query: EmailQuery): Promise<Result<readonly EmailMessage[]>> {
    try {
      const messages = await this.provider.read(query);
      this.logger?.info("email.read.completed", { message_count: messages.length });
      return ok(messages);
    } catch {
      this.logger?.warning("email.read.failed", { reason: "provider_failure" });
      return err({ code: "NOVA-AI002", message: "Email provider read failed.", retryable: true });
    }
  }

  public draft(input: EmailDraft): Result<EmailDraft> {
    if (!input.to || !input.subject || !input.body) {
      this.logger?.warning("email.draft.rejected", { reason: "required_field_missing" });
      return err(this.validationError("Email drafts require recipient, subject, and body."));
    }
    this.logger?.info("email.draft.created", { has_recipient: true, has_subject: true });
    return ok({ ...input });
  }

  public async send(draft: EmailDraft, confirmed: boolean): Promise<Result<EmailSendReceipt>> {
    const automationAllowed = this.automationRules.some(
      (rule) => rule.to === draft.to && rule.subject === draft.subject,
    );
    if (!confirmed && !automationAllowed) {
      this.logger?.warning("email.send.rejected", { reason: "confirmation_required" });
      return err(this.securityError("Sending email requires explicit confirmation."));
    }
    try {
      const receipt = await this.provider.send(draft);
      this.logger?.info("email.send.completed", {
        confirmed,
        automation_rule: automationAllowed,
      });
      return ok(receipt);
    } catch {
      this.logger?.warning("email.send.failed", { reason: "provider_failure" });
      return err({ code: "NOVA-AI002", message: "Email provider send failed.", retryable: true });
    }
  }

  public addAutomationRule(rule: EmailAutomationRule): void {
    this.automationRules.push({ ...rule });
    this.logger?.info("email.automation_rule.added", {
      rule_count: this.automationRules.length,
    });
  }

  private validationError(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }
}
