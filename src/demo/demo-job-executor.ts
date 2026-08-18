import type { IntegrationJob, JobExecutionResult } from "../domain/job.ts";
import type { JobExecutor } from "../repositories/job-executor.ts";

function integerPayload(value: unknown, fallback: number): number {
  return Number.isInteger(value) && typeof value === "number" ? value : fallback;
}

export class DemoJobExecutor implements JobExecutor {
  async execute(job: IntegrationJob): Promise<JobExecutionResult> {
    const mode = job.payload.mode === "permanent_failure" ? "permanent_failure" : "eventual_success";
    if (mode === "permanent_failure") {
      return {
        ok: false,
        retryable: false,
        message: "Fictional permanent integration failure"
      };
    }

    const failuresBeforeSuccess = Math.max(
      0,
      Math.min(integerPayload(job.payload.failuresBeforeSuccess, 1), 10)
    );

    if (job.attempts <= failuresBeforeSuccess) {
      return {
        ok: false,
        retryable: true,
        message: `Fictional transient failure on attempt ${job.attempts}`
      };
    }

    return { ok: true };
  }
}
