import type { JobService } from "./job-service.ts";

type TimerHandle = ReturnType<typeof setTimeout>;

export class JobWorker {
  private readonly service: JobService;
  private readonly pollIntervalMs: number;
  private readonly onError: (error: unknown) => void;
  private timer: TimerHandle | null = null;
  private running = false;

  constructor(options: {
    service: JobService;
    pollIntervalMs: number;
    onError?: (error: unknown) => void;
  }) {
    if (!Number.isInteger(options.pollIntervalMs) || options.pollIntervalMs < 10) {
      throw new Error("Job worker poll interval must be at least 10ms");
    }
    this.service = options.service;
    this.pollIntervalMs = options.pollIntervalMs;
    this.onError = options.onError ?? (() => {});
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.schedule(0);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delayMs: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => void this.tick(), delayMs);
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    try {
      const processed = await this.service.processOne();
      this.schedule(processed ? 0 : this.pollIntervalMs);
    } catch (error) {
      this.onError(error);
      this.schedule(this.pollIntervalMs);
    }
  }
}
