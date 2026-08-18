import { randomUUID } from "node:crypto";
import type { CreateIntegrationEventInput, IntegrationEvent } from "../domain/integration-event.ts";
import type { IntegrationEventRepository } from "../repositories/integration-event-repository.ts";

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  if (normalized.length > 120) throw new Error(`${field} must be 120 characters or fewer`);
  return normalized;
}

export class IntegrationEventService {
  private readonly repository: IntegrationEventRepository;

  constructor(repository: IntegrationEventRepository) {
    this.repository = repository;
  }

  async create(input: CreateIntegrationEventInput): Promise<IntegrationEvent> {
    const now = new Date().toISOString();
    const event: IntegrationEvent = {
      id: randomUUID(),
      correlationId: input.correlationId?.trim() || randomUUID(),
      source: requiredText(input.source, "source"),
      type: requiredText(input.type, "type"),
      status: "accepted",
      payload: structuredClone(input.payload),
      receivedAt: now,
      updatedAt: now
    };

    await this.repository.save(event);
    return event;
  }

  async findById(id: string): Promise<IntegrationEvent | null> {
    return this.repository.findById(id);
  }

  async list(limit = 20): Promise<IntegrationEvent[]> {
    return this.repository.list(Math.min(Math.max(limit, 1), 100));
  }
}
