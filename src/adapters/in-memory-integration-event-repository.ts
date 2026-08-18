import type { IntegrationEvent } from "../domain/integration-event.ts";
import type { IntegrationEventRepository } from "../repositories/integration-event-repository.ts";

export class InMemoryIntegrationEventRepository implements IntegrationEventRepository {
  private readonly events = new Map<string, IntegrationEvent>();

  async save(event: IntegrationEvent): Promise<void> {
    this.events.set(event.id, structuredClone(event));
  }

  async findById(id: string): Promise<IntegrationEvent | null> {
    const event = this.events.get(id);
    return event ? structuredClone(event) : null;
  }

  async list(limit: number): Promise<IntegrationEvent[]> {
    return [...this.events.values()]
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, limit)
      .map((event) => structuredClone(event));
  }
}
