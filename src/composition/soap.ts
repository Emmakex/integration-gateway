import { SoapHttpConnector } from "../adapters/soap-http-connector.ts";
import type { AppConfig } from "../config.ts";
import type { SoapConnector } from "../repositories/soap-connector.ts";

export function buildSoapConnector(config: AppConfig): SoapConnector | null {
  if (!config.soapEndpoint) return null;

  return new SoapHttpConnector({
    endpoint: config.soapEndpoint,
    timeoutMs: config.soapTimeoutMs,
    maxResponseBytes: config.soapMaxResponseBytes
  });
}
