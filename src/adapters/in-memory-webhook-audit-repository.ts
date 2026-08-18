import type { WebhookAuditRecord } from "../domain/webhook.ts";
import type { WebhookAuditRepository } from "../repositories/webhook-audit-repository.ts";

export class InMemoryWebhookAuditRepository implements WebhookAuditRepository {
  private readonly records: WebhookAuditRecord[] = [];

  async append(record: WebhookAuditRecord): Promise<void> {
    this.records.unshift(structuredClone(record));
    if (this.records.length > 200) this.records.length = 200;
  }

  async list(limit: number): Promise<WebhookAuditRecord[]> {
    return this.records.slice(0, Math.min(Math.max(limit, 1), 100)).map((record) => structuredClone(record));
  }
}
