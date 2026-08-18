import Fastify, { type FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import { InMemoryIdempotencyRepository } from "./adapters/in-memory-idempotency-repository.ts";
import { InMemoryIntegrationEventRepository } from "./adapters/in-memory-integration-event-repository.ts";
import { InMemoryWebhookAuditRepository } from "./adapters/in-memory-webhook-audit-repository.ts";
import type { AppConfig } from "./config.ts";
import type { CreateIntegrationEventInput } from "./domain/integration-event.ts";
import type { WebhookIngestInput } from "./domain/webhook.ts";
import { IntegrationEventService } from "./services/integration-event-service.ts";
import { WebhookService } from "./services/webhook-service.ts";

const createEventSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["source", "type", "payload"],
    properties: {
      correlationId: { type: "string", minLength: 1, maxLength: 120 },
      source: { type: "string", minLength: 1, maxLength: 120 },
      type: { type: "string", minLength: 1, maxLength: 120 },
      payload: { type: "object", additionalProperties: true }
    }
  }
} as const;

const webhookSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["source", "eventType"],
    properties: {
      source: { type: "string", minLength: 1, maxLength: 120 },
      eventType: { type: "string", minLength: 1, maxLength: 120 }
    }
  },
  body: {
    type: "object",
    additionalProperties: true
  }
} as const;

type WebhookParams = {
  source: string;
  eventType: string;
};

type WebhookHeaders = {
  "x-integration-signature"?: string;
  "x-integration-timestamp"?: string;
  "x-idempotency-key"?: string;
  "x-correlation-id"?: string;
};

function rejectionStatus(reason: string): number {
  if (reason === "webhooks_not_configured") return 503;
  if (reason === "missing_idempotency_key") return 400;
  if (reason === "idempotency_event_missing") return 409;
  if (reason === "processing_error") return 500;
  return 401;
}

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  await app.register(fastifyRawBody, {
    global: false,
    encoding: "utf8",
    runFirst: true
  });

  const eventRepository = new InMemoryIntegrationEventRepository();
  const eventService = new IntegrationEventService(eventRepository);
  const idempotencyRepository = new InMemoryIdempotencyRepository();
  const auditRepository = new InMemoryWebhookAuditRepository();
  const webhookService = new WebhookService(
    eventService,
    idempotencyRepository,
    auditRepository,
    config.webhookSigningSecret,
    config.webhookMaxAgeSeconds
  );

  app.get("/health", async () => ({
    status: "ok",
    service: config.serviceName,
    time: new Date().toISOString()
  }));

  app.get("/ready", async () => ({
    status: "ready",
    checks: {
      eventRepository: "ok",
      webhookSignature: config.webhookSigningSecret ? "configured" : "disabled"
    }
  }));

  app.post<{ Body: CreateIntegrationEventInput }>(
    "/v1/integration-events",
    { schema: createEventSchema },
    async (request, reply) => {
      const event = await eventService.create(request.body);
      return reply.code(201).send(event);
    }
  );

  app.get<{ Querystring: { limit?: string } }>(
    "/v1/integration-events",
    async (request) => {
      const parsed = Number.parseInt(request.query.limit ?? "20", 10);
      const limit = Number.isFinite(parsed) ? parsed : 20;
      return { items: await eventService.list(limit) };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/v1/integration-events/:id",
    async (request, reply) => {
      const event = await eventService.findById(request.params.id);
      if (!event) {
        return reply.code(404).send({
          error: "not_found",
          message: "Integration event was not found"
        });
      }
      return event;
    }
  );

  app.post<{
    Params: WebhookParams;
    Headers: WebhookHeaders;
    Body: Record<string, unknown>;
  }>(
    "/v1/webhooks/:source/:eventType",
    {
      config: { rawBody: true },
      schema: webhookSchema
    },
    async (request, reply) => {
      const rawBody = typeof request.rawBody === "string"
        ? request.rawBody
        : request.rawBody?.toString("utf8");

      if (!rawBody) {
        return reply.code(400).send({
          error: "raw_body_unavailable",
          message: "Webhook raw body is required for signature verification"
        });
      }

      const input: WebhookIngestInput = {
        rawBody,
        payload: request.body,
        source: request.params.source,
        eventType: request.params.eventType,
        idempotencyKey: request.headers["x-idempotency-key"] ?? "",
        timestamp: request.headers["x-integration-timestamp"] ?? "",
        signature: request.headers["x-integration-signature"] ?? ""
      };
      const correlationId = request.headers["x-correlation-id"]?.trim();
      if (correlationId) input.correlationId = correlationId;

      const result = await webhookService.ingest(input);
      if (result.kind === "accepted") {
        return reply.code(202).send({ accepted: true, replayed: false, event: result.event });
      }
      if (result.kind === "replayed") {
        return reply.code(200).send({ accepted: true, replayed: true, event: result.event });
      }
      if (result.kind === "in_progress") {
        return reply.code(409).send({ error: "idempotency_in_progress" });
      }

      return reply.code(rejectionStatus(result.reason)).send({
        error: "webhook_rejected",
        reason: result.reason
      });
    }
  );

  if (config.exposeAuditApi) {
    app.get<{ Querystring: { limit?: string } }>("/v1/webhook-audit", async (request) => {
      const parsed = Number.parseInt(request.query.limit ?? "20", 10);
      const limit = Number.isFinite(parsed) ? parsed : 20;
      return { items: await webhookService.listAudit(limit) };
    });
  }

  return app;
}
