import { randomUUID } from "node:crypto";
import type { SoapResult } from "../domain/soap.ts";
import type { SoapConnector } from "../repositories/soap-connector.ts";

export class SoapDemoService {
  private readonly connector: SoapConnector;

  constructor(connector: SoapConnector) {
    this.connector = connector;
  }

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
