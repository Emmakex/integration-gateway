import Fastify, { type FastifyInstance } from "fastify";
import { InMemoryIntegrationEventRepository } from "./adapters/in-memory-integration-event-repository.ts";
import type { AppConfig } from "./config.ts";
import type { CreateIntegrationEventInput } from "./domain/integration-event.ts";
import { IntegrationEventService } from "./services/integration-event-service.ts";

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

export function buildApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  const repository = new InMemoryIntegrationEventRepository();
  const service = new IntegrationEventService(repository);

  app.get("/health", async () => ({
    status: "ok",
    service: config.serviceName,
    time: new Date().toISOString()
  }));

  app.get("/ready", async () => ({
    status: "ready",
    checks: {
      eventRepository: "ok"
    }
  }));

  app.post<{ Body: CreateIntegrationEventInput }>(
    "/v1/integration-events",
    { schema: createEventSchema },
    async (request, reply) => {
      const event = await service.create(request.body);
      return reply.code(201).send(event);
    }
  );

  app.get<{ Querystring: { limit?: string } }>(
    "/v1/integration-events",
    async (request) => {
      const parsed = Number.parseInt(request.query.limit ?? "20", 10);
      const limit = Number.isFinite(parsed) ? parsed : 20;
      return { items: await service.list(limit) };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/v1/integration-events/:id",
    async (request, reply) => {
      const event = await service.findById(request.params.id);
      if (!event) {
        return reply.code(404).send({
          error: "not_found",
          message: "Integration event was not found"
        });
      }
      return event;
    }
  );

  return app;
}
