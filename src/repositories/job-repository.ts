import type { IntegrationJob } from "../domain/job.ts";

export interface JobRepository {
  create(job: IntegrationJob): Promise<IntegrationJob>;
  findById(id: string): Promise<IntegrationJob | null>;
  list(limit: number): Promise<IntegrationJob[]>;
  claimDue(now: Date): Promise<IntegrationJob | null>;
  save(job: IntegrationJob): Promise<IntegrationJob>;
  countByStatus(): Promise<Record<IntegrationJob["status"], number>>;
}
