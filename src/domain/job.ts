export type IntegrationJobStatus =
  | "queued"
  | "running"
  | "retry_scheduled"
  | "succeeded"
  | "dead_letter";

export type JobTransition = {
  at: string;
  from: IntegrationJobStatus | null;
  to: IntegrationJobStatus;
  reason: string;
};

export type IntegrationJob = {
  id: string;
  type: string;
  status: IntegrationJobStatus;
  correlationId: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
  replayedFromJobId: string | null;
  history: JobTransition[];
};

export type CreateIntegrationJobInput = {
  type: string;
  correlationId?: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  replayedFromJobId?: string;
};

export type JobExecutionResult =
  | { ok: true }
  | { ok: false; retryable: boolean; message: string };

export type JobMetricsSnapshot = {
  enqueued: number;
  executionAttempts: number;
  succeeded: number;
  retryScheduled: number;
  deadLettered: number;
  replayed: number;
  statusCounts: Record<IntegrationJobStatus, number>;
};
