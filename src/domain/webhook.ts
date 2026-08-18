import type { IntegrationEvent } from "./integration-event.ts";

export type WebhookAuditOutcome = "accepted" | "replayed" | "rejected" | "in_progress";

export type WebhookAuditRecord = {
  id: string;
  idempotencyKey: string;
  source: string;
  eventType: string;
  outcome: WebhookAuditOutcome;
  recordedAt: string;
  eventId?: string;
  reason?: string;
};

export type WebhookIngestInput = {
  rawBody: string;
  payload: Record<string, unknown>;
  source: string;
  eventType: string;
  idempotencyKey: string;
  timestamp: string;
  signature: string;
  correlationId?: string;
};

export type WebhookIngestResult =
  | { kind: "accepted"; event: IntegrationEvent }
  | { kind: "replayed"; event: IntegrationEvent }
  | { kind: "in_progress" }
  | { kind: "rejected"; reason: string };
