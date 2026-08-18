import type { OutboundRequest, OutboundResult } from "../domain/outbound.ts";
import type { OutboundConnector } from "../repositories/outbound-connector.ts";

export class DisabledOutboundConnector implements OutboundConnector {
  async send(_request: OutboundRequest): Promise<OutboundResult> {
    return {
      ok: false,
      attempts: 0,
      failure: {
        kind: "configuration",
        retryable: false,
        message: "Outbound connector is not configured"
      }
    };
  }
}
