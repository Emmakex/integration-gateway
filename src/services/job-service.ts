import { randomUUID } from "node:crypto";
import type {
  CreateIntegrationJobInput,
  IntegrationJob,
  IntegrationJobStatus,
  JobExecutionResult,
  JobMetricsSnapshot
} from "../domain/job.ts";
import { JobMetrics } from "../observability/job-metrics.ts";
import { computeRetryDelayMs, type RetryPolicy } from "../reliability/retry-policy.ts";
import type { JobExecutorRegistry } from "../repositories/job-executor.ts";
import type { JobRepository } from "../repositories/job-repository.ts";

type Clock = () => Date;

function normalizedType(value: string): string {
  const type = value.trim();
  if (!type || type.length > 120 || !/^[a-z0-9][a-z0-9._-]*$/i.test(type)) {
    throw new Error("Job type must be 1-120 letters, numbers, dots, dashes or underscores");
  }
  return type;
}

function normalizedMaxAttempts(value: number | undefined): number {
  if (value === undefined) return 3;
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new Error("Job maxAttempts must be an integer between 1 and 20");
  }
  return value;
}

function transition(
  job: IntegrationJob,
  to: IntegrationJobStatus,
  reason: string,
  now: Date,
  options: { lastError?: string | null; availableAt?: string } = {}
): IntegrationJob {
  const timestamp = now.toISOString();
  const next: IntegrationJob = {
    ...job,
    status: to,
    updatedAt: timestamp,
    history: [
      ...job.history,
      { at: timestamp, from: job.status, to, reason }
    ]
  };

  if ("lastError" in options) next.lastError = options.lastError ?? null;
  if (options.availableAt) next.availableAt = options.availableAt;
  return next;
}

export class JobService {
  private readonly repository: JobRepository;
  private readonly executors: JobExecutorRegistry;
  private readonly metrics: JobMetrics;
  private readonly retryPolicy: RetryPolicy;
  private readonly clock: Clock;

  constructor(options: {
    repository: JobRepository;
    executors: JobExecutorRegistry;
    metrics: JobMetrics;
    retryPolicy: RetryPolicy;
    clock?: Clock;
  }) {
    this.repository = options.repository;
    this.executors = options.executors;
    this.metrics = options.metrics;
    this.retryPolicy = options.retryPolicy;
    this.clock = options.clock ?? (() => new Date());
  }

  async enqueue(input: CreateIntegrationJobInput): Promise<IntegrationJob> {
    const now = this.clock();
    const timestamp = now.toISOString();
    const status: IntegrationJobStatus = "queued";
    const job: IntegrationJob = {
      id: randomUUID(),
      type: normalizedType(input.type),
      status,
      correlationId: input.correlationId?.trim() || randomUUID(),
      payload: structuredClone(input.payload),
      attempts: 0,
      maxAttempts: normalizedMaxAttempts(input.maxAttempts),
      availableAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastError: null,
      replayedFromJobId: input.replayedFromJobId?.trim() || null,
      history: [
        {
          at: timestamp,
          from: null,
          to: status,
          reason: input.replayedFromJobId ? `replayed_from:${input.replayedFromJobId}` : "enqueued"
        }
      ]
    };

    const created = await this.repository.create(job);
    this.metrics.markEnqueued();
    if (job.replayedFromJobId) this.metrics.markReplayed();
    return created;
  }

  async processOne(): Promise<IntegrationJob | null> {
    const claimed = await this.repository.claimDue(this.clock());
    if (!claimed) return null;
    this.metrics.markAttempt();

    const executor = this.executors.resolve(claimed.type);
    let result: JobExecutionResult;

    if (!executor) {
      result = {
        ok: false,
        retryable: false,
        message: `No executor is registered for job type ${claimed.type}`
      };
    } else {
      try {
        result = await executor.execute(claimed);
      } catch {
        result = {
          ok: false,
          retryable: true,
          message: "Job executor threw an unexpected error"
        };
      }
    }

    const now = this.clock();
    if (result.ok) {
      const succeeded = transition(claimed, "succeeded", "execution_succeeded", now, {
        lastError: null
      });
      this.metrics.markSucceeded();
      return this.repository.save(succeeded);
    }

    if (result.retryable && claimed.attempts < claimed.maxAttempts) {
      const delayMs = computeRetryDelayMs(claimed.attempts, this.retryPolicy);
      const availableAt = new Date(now.getTime() + delayMs).toISOString();
      const scheduled = transition(claimed, "retry_scheduled", "retryable_failure", now, {
        lastError: result.message,
        availableAt
      });
      this.metrics.markRetryScheduled();
      return this.repository.save(scheduled);
    }

    const reason = result.retryable ? "retry_budget_exhausted" : "permanent_failure";
    const deadLetter = transition(claimed, "dead_letter", reason, now, {
      lastError: result.message
    });
    this.metrics.markDeadLettered();
    return this.repository.save(deadLetter);
  }

  async replayDeadLetter(id: string): Promise<IntegrationJob> {
    const original = await this.repository.findById(id);
    if (!original) throw new Error("Job was not found");
    if (original.status !== "dead_letter") {
      throw new Error("Only dead-letter jobs can be replayed");
    }

    return this.enqueue({
      type: original.type,
      correlationId: original.correlationId,
      payload: original.payload,
      maxAttempts: original.maxAttempts,
      replayedFromJobId: original.id
    });
  }

  async findById(id: string): Promise<IntegrationJob | null> {
    return this.repository.findById(id);
  }

  async list(limit = 50): Promise<IntegrationJob[]> {
    return this.repository.list(limit);
  }

  async metricsSnapshot(): Promise<JobMetricsSnapshot> {
    return this.metrics.snapshot(this.repository);
  }
}
