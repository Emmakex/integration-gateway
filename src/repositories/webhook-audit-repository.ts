import type { WebhookAuditRecord } from "../domain/webhook.ts";

export interface WebhookAuditRepository {
  append(record: WebhookAuditRecord): Promise<void>;
  list(limit: number): Promise<WebhookAuditRecord[]>;
}
