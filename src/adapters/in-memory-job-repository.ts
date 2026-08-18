import type { IntegrationJob, IntegrationJobStatus } from "../domain/job.ts";
import type { JobRepository } from "../repositories/job-repository.ts";

function clone(job: IntegrationJob): IntegrationJob {
  return structuredClone(job);
}

function emptyCounts(): Record<IntegrationJobStatus, number> {
  return {
    queued: 0,
    running: 0,
    retry_scheduled: 0,
    succeeded: 0,
    dead_letter: 0
  };
}

export class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, IntegrationJob>();

  async create(job: IntegrationJob): Promise<IntegrationJob> {
    if (this.jobs.has(job.id)) throw new Error("Job id already exists");
    this.jobs.set(job.id, clone(job));
    return clone(job);
  }

  async findById(id: string): Promise<IntegrationJob | null> {
    const job = this.jobs.get(id);
    return job ? clone(job) : null;
  }

  async list(limit: number): Promise<IntegrationJob[]> {
    return [...this.jobs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.max(1, Math.min(limit, 200)))
      .map(clone);
  }

  async claimDue(now: Date): Promise<IntegrationJob | null> {
    const nowMs = now.getTime();
    const candidate = [...this.jobs.values()]
      .filter((job) =>
        (job.status === "queued" || job.status === "retry_scheduled") &&
        Date.parse(job.availableAt) <= nowMs
      )
      .sort((a, b) => {
        const byAvailability = a.availableAt.localeCompare(b.availableAt);
        return byAvailability !== 0 ? byAvailability : a.createdAt.localeCompare(b.createdAt);
      })[0];

    if (!candidate) return null;

    const timestamp = now.toISOString();
    const claimed: IntegrationJob = {
      ...clone(candidate),
      status: "running",
      attempts: candidate.attempts + 1,
      updatedAt: timestamp,
      history: [
        ...candidate.history,
        {
          at: timestamp,
          from: candidate.status,
          to: "running",
          reason: `execution_attempt_${candidate.attempts + 1}`
        }
      ]
    };

    this.jobs.set(claimed.id, clone(claimed));
    return clone(claimed);
  }

  async save(job: IntegrationJob): Promise<IntegrationJob> {
    if (!this.jobs.has(job.id)) throw new Error("Cannot save an unknown job");
    this.jobs.set(job.id, clone(job));
    return clone(job);
  }

  async countByStatus(): Promise<Record<IntegrationJobStatus, number>> {
    const counts = emptyCounts();
    for (const job of this.jobs.values()) counts[job.status] += 1;
    return counts;
  }
}
