import type { SoapRequest, SoapResult } from "../domain/soap.ts";

export interface SoapConnector {
  send(request: SoapRequest): Promise<SoapResult>;
}
