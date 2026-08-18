import { DisabledOutboundConnector } from "../adapters/disabled-outbound-connector.ts";
import { RestOutboundConnector } from "../adapters/rest-outbound-connector.ts";
import type { AppConfig } from "../config.ts";
import type { OutboundConnector } from "../repositories/outbound-connector.ts";

export function buildOutboundConnector(config: AppConfig): OutboundConnector {
  if (!config.outboundBaseUrl) return new DisabledOutboundConnector();

  return new RestOutboundConnector({
    baseUrl: config.outboundBaseUrl,
    timeoutMs: config.outboundTimeoutMs,
    retryPolicy: {
      maxAttempts: config.outboundMaxAttempts,
      baseDelayMs: config.outboundRetryBaseDelayMs,
      maxDelayMs: config.outboundRetryMaxDelayMs
    }
  });
}
