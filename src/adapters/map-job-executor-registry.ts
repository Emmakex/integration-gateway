import type { JobExecutor, JobExecutorRegistry } from "../repositories/job-executor.ts";

export class MapJobExecutorRegistry implements JobExecutorRegistry {
  private readonly executors = new Map<string, JobExecutor>();

  register(type: string, executor: JobExecutor): void {
    const normalized = type.trim();
    if (!normalized) throw new Error("Job executor type is required");
    if (this.executors.has(normalized)) {
      throw new Error(`Job executor is already registered for ${normalized}`);
    }
    this.executors.set(normalized, executor);
  }

  resolve(type: string): JobExecutor | null {
    return this.executors.get(type) ?? null;
  }
}
