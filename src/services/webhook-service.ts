import { randomUUID } from "node:crypto";
import type { CreateIntegrationEventInput } from "../domain/integration-event.ts";
import type {
  WebhookAuditOutcome,
  WebhookAuditRecord,
  WebhookIngestInput,
  WebhookIngestResult
} from "../domain/webhook.ts";
import type { IdempotencyRepository } from "../repositories/idempotency-repository.ts";
import type { WebhookAuditRepository } from "../repositories/webhook-audit-repository.ts";
import { verifyWebhookSignature } from "../security/webhook-signature.ts";
import { IntegrationEventService } from "./integration-event-service.ts";

export class WebhookService {
  private readonly eventService: IntegrationEventService;
  private readonly idempotency: IdempotencyRepository;
  private readonly auditRepository: WebhookAuditRepository;
  private readonly signingSecret: string | null;
  private readonly maxAgeSeconds: number;

  constructor(
    eventService: IntegrationEventService,
    idempotency: IdempotencyRepository,
    auditRepository: WebhookAuditRepository,
    signingSecret: string | null,
    maxAgeSeconds: number
  ) {
    this.eventService = eventService;
    this.idempotency = idempotency;
    this.auditRepository = auditRepository;
    this.signingSecret = signingSecret;
    this.maxAgeSeconds = maxAgeSeconds;
  }

  async ingest(input: WebhookIngestInput): Promise<WebhookIngestResult> {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) {
      await this.audit(input, "rejected", undefined, "missing_idempotency_key");
      return { kind: "rejected", reason: "missing_idempotency_key" };
    }

    if (!this.signingSecret) {
      await this.audit(input, "rejected", undefined, "webhooks_not_configured");
      return { kind: "rejected", reason: "webhooks_not_configured" };
    }

    const verification = verifyWebhookSignature({
      rawBody: input.rawBody,
      timestamp: input.timestamp,
      signature: input.signature,
      secret: this.signingSecret,
      maxAgeSeconds: this.maxAgeSeconds
    });

    if (!verification.valid) {
      await this.audit(input, "rejected", undefined, verification.reason);
      return { kind: "rejected", reason: verification.reason };
    }

    const claim = await this.idempotency.claim(idempotencyKey);
    if (claim.status === "in_progress") {
      await this.audit(input, "in_progress");
      return { kind: "in_progress" };
    }

    if (claim.status === "completed") {
      const existing = await this.eventService.findById(claim.eventId);
      if (!existing) {
        await this.audit(input, "rejected", claim.eventId, "idempotency_event_missing");
        return { kind: "rejected", reason: "idempotency_event_missing" };
      }
      await this.audit(input, "replayed", existing.id);
      return { kind: "replayed", event: existing };
    }

    try {
      const eventInput: CreateIntegrationEventInput = {
        source: input.source,
        type: input.eventType,
        payload: input.payload
      };
      if (input.correlationId?.trim()) eventInput.correlationId = input.correlationId.trim();

      const event = await this.eventService.create(eventInput);
      await this.idempotency.complete(idempotencyKey, event.id);
      await this.audit(input, "accepted", event.id);
      return { kind: "accepted", event };
    } catch {
      await this.idempotency.release(idempotencyKey);
      await this.audit(input, "rejected", undefined, "processing_error");
      return { kind: "rejected", reason: "processing_error" };
    }
  }

  async listAudit(limit = 20): Promise<WebhookAuditRecord[]> {
    return this.auditRepository.list(Math.min(Math.max(limit, 1), 100));
  }

  private async audit(
    input: WebhookIngestInput,
    outcome: WebhookAuditOutcome,
    eventId?: string,
    reason?: string
  ): Promise<void> {
    const record: WebhookAuditRecord = {
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey.trim() || "missing",
      source: input.source,
      eventType: input.eventType,
      outcome,
      recordedAt: new Date().toISOString()
    };
    if (eventId) record.eventId = eventId;
    if (reason) record.reason = reason;
    await this.auditRepository.append(record);
  }
}
