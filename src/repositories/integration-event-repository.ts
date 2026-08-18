import type { IntegrationEvent } from "../domain/integration-event.ts";

export interface IntegrationEventRepository {
  save(event: IntegrationEvent): Promise<void>;
  findById(id: string): Promise<IntegrationEvent | null>;
  list(limit: number): Promise<IntegrationEvent[]>;
}
