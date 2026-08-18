import type { OutboundRequest, OutboundResult } from "../domain/outbound.ts";
import type { OutboundConnector } from "../repositories/outbound-connector.ts";

export class OutboundIntegrationService {
  private readonly connector: OutboundConnector;

  constructor(connector: OutboundConnector) {
    this.connector = connector;
  }

  async dispatch(request: OutboundRequest): Promise<OutboundResult> {
    return this.connector.send(request);
  }
}
