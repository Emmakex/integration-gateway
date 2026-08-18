import type { JobMetricsSnapshot } from "../domain/job.ts";
import type { JobRepository } from "../repositories/job-repository.ts";

export class JobMetrics {
  private enqueued = 0;
  private executionAttempts = 0;
  private succeeded = 0;
  private retryScheduled = 0;
  private deadLettered = 0;
  private replayed = 0;

  markEnqueued(): void {
    this.enqueued += 1;
  }

  markAttempt(): void {
    this.executionAttempts += 1;
  }

  markSucceeded(): void {
    this.succeeded += 1;
  }

  markRetryScheduled(): void {
    this.retryScheduled += 1;
  }

  markDeadLettered(): void {
    this.deadLettered += 1;
  }

  markReplayed(): void {
    this.replayed += 1;
  }

  async snapshot(repository: JobRepository): Promise<JobMetricsSnapshot> {
    return {
      enqueued: this.enqueued,
      executionAttempts: this.executionAttempts,
      succeeded: this.succeeded,
      retryScheduled: this.retryScheduled,
      deadLettered: this.deadLettered,
      replayed: this.replayed,
      statusCounts: await repository.countByStatus()
    };
  }
}
