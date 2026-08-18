import type { IntegrationJob, JobExecutionResult } from "../domain/job.ts";

export interface JobExecutor {
  execute(job: IntegrationJob): Promise<JobExecutionResult>;
}

export interface JobExecutorRegistry {
  resolve(type: string): JobExecutor | null;
}
