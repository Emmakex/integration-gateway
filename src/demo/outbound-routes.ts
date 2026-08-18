import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { OutboundIntegrationService } from "../services/outbound-integration-service.ts";

type DemoBody = {
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

type DemoTargetHeaders = {
  "x-correlation-id"?: string;
};

export function registerDemoOutboundTarget(app: FastifyInstance): void {
  const attempts = new Map<string, number>();

  app.post<{
    Headers: DemoTargetHeaders;
    Body: Record<string, unknown>;
  }>("/v1/demo-target/retryable", async (request, reply) => {
    const key = request.headers["x-correlation-id"] ?? "missing";
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);

    if (attempt < 3) {
      return reply.code(503).header("retry-after", "0").send({
        ok: false,
        attempt,
        message: "fictional transient failure"
      });
    }

    return {
      ok: true,
      attempt,
      received: request.body
    };
  });
}

export function registerDemoOutboundApi(
  app: FastifyInstance,
  service: OutboundIntegrationService
): void {
  app.post<{ Body: DemoBody }>(
    "/v1/demo/outbound",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["payload", "idempotencyKey"],
          properties: {
            payload: { type: "object", additionalProperties: true },
            idempotencyKey: { type: "string", minLength: 1, maxLength: 120 }
          }
        }
      }
    },
    async (request, reply) => {
      const correlationId = randomUUID();
      const result = await service.dispatch({
        method: "POST",
        path: "/v1/demo-target/retryable",
        correlationId,
        idempotencyKey: request.body.idempotencyKey,
        body: request.body.payload
      });

      return reply.code(result.ok ? 200 : 502).send({ correlationId, result });
    }
  );
}
