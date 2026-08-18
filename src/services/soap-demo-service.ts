import { randomUUID } from "node:crypto";
import type { SoapResult } from "../domain/soap.ts";
import type { SoapConnector } from "../repositories/soap-connector.ts";

export class SoapDemoService {
  constructor(private readonly connector: SoapConnector) {}

  async ping(mode: "success" | "fault" = "success"): Promise<SoapResult> {
    return this.connector.send({
      version: "1.1",
      operation: "Ping",
      namespace: "urn:integration-gateway:demo",
      action: "urn:integration-gateway:demo/Ping",
      correlationId: randomUUID(),
      payload: {
        mode,
        requestId: randomUUID()
      }
    });
  }
}
