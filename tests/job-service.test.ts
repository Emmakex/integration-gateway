import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryJobRepository } from "../src/adapters/in-memory-job-repository.ts";
import { MapJobExecutorRegistry } from "../src/adapters/map-job-executor-registry.ts";
import { DemoJobExecutor } from "../src/demo/demo-job-executor.ts";
import { JobMetrics } from "../src/observability/job-metrics.ts";
import { JobService } from "../src/services/job-service.ts";

function harness() {
  let nowMs = Date.parse("2026-08-18T18:00:00.000Z");
  const repository = new InMemoryJobRepository();
  const registry = new MapJobExecutorRegistry();
  registry.register("demo.integration", new DemoJobExecutor());
  const service = new JobService({
    repository,
    executors: registry,
    metrics: new JobMetrics(),
    retryPolicy: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000 },
    defaultMaxAttempts: 3,
    clock: () => new Date(nowMs)
  });

  return {
    service,
    advance(ms: number) {
      nowMs += ms;
    }
  };
}

test("schedules a retry and later succeeds", async () => {
  const { service, advance } = harness();
  const queued = await service.enqueue({
    type: "demo.integration",
    payload: { mode: "eventual_success", failuresBeforeSuccess: 1 }
  });

  const first = await service.processOne();
  assert.equal(first?.id, queued.id);
  assert.equal(first?.status, "retry_scheduled");
  assert.equal(first?.attempts, 1);

  assert.equal(await service.processOne(), null);
  advance(100);

  const second = await service.processOne();
  assert.equal(second?.status, "succeeded");
  assert.equal(second?.attempts, 2);
  assert.equal(second?.lastError, null);

  const metrics = await service.metricsSnapshot();
  assert.equal(metrics.enqueued, 1);
  assert.equal(metrics.executionAttempts, 2);
  assert.equal(metrics.retryScheduled, 1);
  assert.equal(metrics.succeeded, 1);
  assert.equal(metrics.statusCounts.succeeded, 1);
});

test("moves permanent failures to dead-letter and replays as a new job", async () => {
  const { service } = harness();
  const original = await service.enqueue({
    type: "demo.integration",
    payload: { mode: "permanent_failure" }
  });

  const dead = await service.processOne();
  assert.equal(dead?.status, "dead_letter");
  assert.equal(dead?.attempts, 1);

  const replay = await service.replayDeadLetter(original.id);
  assert.notEqual(replay.id, original.id);
  assert.equal(replay.status, "queued");
  assert.equal(replay.replayedFromJobId, original.id);
  assert.equal(replay.correlationId, original.correlationId);

  const untouchedOriginal = await service.findById(original.id);
  assert.equal(untouchedOriginal?.status, "dead_letter");

  const metrics = await service.metricsSnapshot();
  assert.equal(metrics.deadLettered, 1);
  assert.equal(metrics.replayed, 1);
  assert.equal(metrics.enqueued, 2);
});

test("dead-letters jobs with no registered executor", async () => {
  let nowMs = Date.parse("2026-08-18T18:00:00.000Z");
  const repository = new InMemoryJobRepository();
  const service = new JobService({
    repository,
    executors: new MapJobExecutorRegistry(),
    metrics: new JobMetrics(),
    retryPolicy: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000 },
    defaultMaxAttempts: 3,
    clock: () => new Date(nowMs)
  });

  await service.enqueue({ type: "unknown.integration", payload: {} });
  const result = await service.processOne();
  assert.equal(result?.status, "dead_letter");
  assert.match(result?.lastError ?? "", /No executor is registered/);
  nowMs += 1;
});
