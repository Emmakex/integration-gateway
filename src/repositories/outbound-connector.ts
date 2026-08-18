import type { OutboundRequest, OutboundResult } from "../domain/outbound.ts";

export interface OutboundConnector {
  send(request: OutboundRequest): Promise<OutboundResult>;
}
