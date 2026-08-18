import type { FastifyInstance } from "fastify";
import type { JobService } from "../services/job-service.ts";

const enqueueSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      mode: { type: "string", enum: ["eventual_success", "permanent_failure"] },
      failuresBeforeSuccess: { type: "integer", minimum: 0, maximum: 10 },
      maxAttempts: { type: "integer", minimum: 1, maximum: 20 },
      correlationId: { type: "string", minLength: 1, maxLength: 120 }
    }
  }
} as const;

type EnqueueBody = {
  mode?: "eventual_success" | "permanent_failure";
  failuresBeforeSuccess?: number;
  maxAttempts?: number;
  correlationId?: string;
};

export function registerDemoJobApi(app: FastifyInstance, service: JobService): void {
  app.post<{ Body: EnqueueBody }>(
    "/v1/demo/jobs",
    { schema: enqueueSchema },
    async (request, reply) => {
      const payload: Record<string, unknown> = {
        mode: request.body.mode ?? "eventual_success",
        failuresBeforeSuccess: request.body.failuresBeforeSuccess ?? 1
      };
      const input: {
        type: string;
        payload: Record<string, unknown>;
        maxAttempts?: number;
        correlationId?: string;
      } = {
        type: "demo.integration",
        payload
      };
      if (request.body.maxAttempts !== undefined) input.maxAttempts = request.body.maxAttempts;
      if (request.body.correlationId?.trim()) input.correlationId = request.body.correlationId.trim();

      const job = await service.enqueue(input);
      return reply.code(201).send(job);
    }
  );

  app.post("/v1/demo/jobs/process", async (_request, reply) => {
    const job = await service.processOne();
    return reply.code(200).send({ processed: Boolean(job), job });
  });

  app.get<{ Querystring: { limit?: string } }>("/v1/demo/jobs", async (request) => {
    const parsed = Number.parseInt(request.query.limit ?? "50", 10);
    const limit = Number.isFinite(parsed) ? parsed : 50;
    return { items: await service.list(limit) };
  });

  app.get<{ Params: { id: string } }>("/v1/demo/jobs/:id", async (request, reply) => {
    const job = await service.findById(request.params.id);
    if (!job) return reply.code(404).send({ error: "job_not_found" });
    return job;
  });

  app.post<{ Params: { id: string } }>("/v1/demo/jobs/:id/replay", async (request, reply) => {
    try {
      const replay = await service.replayDeadLetter(request.params.id);
      return reply.code(201).send(replay);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job replay failed";
      const statusCode = message === "Job was not found" ? 404 : 409;
      return reply.code(statusCode).send({ error: "job_replay_rejected", message });
    }
  });

  app.get("/v1/demo/job-metrics", async () => service.metricsSnapshot());
}
