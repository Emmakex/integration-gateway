import { InMemoryJobRepository } from "../adapters/in-memory-job-repository.ts";
import { MapJobExecutorRegistry } from "../adapters/map-job-executor-registry.ts";
import type { AppConfig } from "../config.ts";
import { DemoJobExecutor } from "../demo/demo-job-executor.ts";
import { JobMetrics } from "../observability/job-metrics.ts";
import { JobService } from "../services/job-service.ts";
import { JobWorker } from "../services/job-worker.ts";

export type JobRuntime = {
  service: JobService;
  worker: JobWorker;
};

export function buildJobRuntime(config: AppConfig, onError?: (error: unknown) => void): JobRuntime {
  const repository = new InMemoryJobRepository();
  const registry = new MapJobExecutorRegistry();
  registry.register("demo.integration", new DemoJobExecutor());

  const service = new JobService({
    repository,
    executors: registry,
    metrics: new JobMetrics(),
    retryPolicy: {
      maxAttempts: config.jobDefaultMaxAttempts,
      baseDelayMs: config.jobRetryBaseDelayMs,
      maxDelayMs: config.jobRetryMaxDelayMs
    },
    defaultMaxAttempts: config.jobDefaultMaxAttempts
  });

  const workerOptions: {
    service: JobService;
    pollIntervalMs: number;
    onError?: (error: unknown) => void;
  } = {
    service,
    pollIntervalMs: config.jobPollIntervalMs
  };
  if (onError) workerOptions.onError = onError;

  return {
    service,
    worker: new JobWorker(workerOptions)
  };
}
