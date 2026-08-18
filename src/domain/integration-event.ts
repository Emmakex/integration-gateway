export type IntegrationEventStatus = "accepted" | "processed" | "failed";

export type IntegrationEvent = {
  id: string;
  correlationId: string;
  source: string;
  type: string;
  status: IntegrationEventStatus;
  payload: Record<string, unknown>;
  receivedAt: string;
  updatedAt: string;
};

export type CreateIntegrationEventInput = {
  correlationId?: string;
  source: string;
  type: string;
  payload: Record<string, unknown>;
};
