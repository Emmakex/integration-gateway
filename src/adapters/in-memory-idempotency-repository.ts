import type {
  IdempotencyClaim,
  IdempotencyRepository
} from "../repositories/idempotency-repository.ts";

type Entry =
  | { state: "pending" }
  | { state: "completed"; eventId: string };

export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private readonly entries = new Map<string, Entry>();

  async claim(key: string): Promise<IdempotencyClaim> {
    const existing = this.entries.get(key);
    if (!existing) {
      this.entries.set(key, { state: "pending" });
      return { status: "claimed" };
    }

    if (existing.state === "completed") {
      return { status: "completed", eventId: existing.eventId };
    }

    return { status: "in_progress" };
  }

  async complete(key: string, eventId: string): Promise<void> {
    this.entries.set(key, { state: "completed", eventId });
  }

  async release(key: string): Promise<void> {
    const existing = this.entries.get(key);
    if (existing?.state === "pending") this.entries.delete(key);
  }
}
