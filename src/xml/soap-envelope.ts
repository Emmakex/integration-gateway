import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type { SoapFault, SoapRequest, SoapVersion } from "../domain/soap.ts";

const SOAP_NAMESPACES: Record<SoapVersion, string> = {
  "1.1": "http://schemas.xmlsoap.org/soap/envelope/",
  "1.2": "http://www.w3.org/2003/05/soap-envelope"
};

const XML_LOCAL_NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  processEntities: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: false
});

function assertOperationName(value: string): void {
  if (!XML_LOCAL_NAME.test(value)) {
    throw new Error("SOAP operation must be a valid XML local name");
  }
}

function assertNamespace(value: string): void {
  const trimmed = value.trim();
  if (!trimmed || /[<>'\"]/.test(trimmed)) {
    throw new Error("SOAP namespace is invalid");
  }
}

export function buildSoapEnvelope(request: SoapRequest): string {
  assertOperationName(request.operation);
  assertNamespace(request.namespace);

  const envelope = {
    "soap:Envelope": {
      "@_xmlns:soap": SOAP_NAMESPACES[request.version],
      "soap:Header": {},
      "soap:Body": {
        [`m:${request.operation}`]: {
          "@_xmlns:m": request.namespace,
          ...request.payload
        }
      }
    }
  };

  return `<?xml version="1.0" encoding="UTF-8"?>${builder.build(envelope)}`;
}

function objectValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const text = (value as Record<string, unknown>)["#text"];
    return textValue(text);
  }
  return null;
}

function parseFault(fault: unknown): SoapFault {
  const code11 = textValue(objectValue(fault, "faultcode"));
  const reason11 = textValue(objectValue(fault, "faultstring"));
  const code12 = textValue(objectValue(objectValue(fault, "Code"), "Value"));
  const reason12 = textValue(objectValue(objectValue(fault, "Reason"), "Text"));

  return {
    code: code11 ?? code12,
    reason: reason11 ?? reason12,
    detail: objectValue(fault, "detail") ?? objectValue(fault, "Detail") ?? null
  };
}

export type ParsedSoapResponse = {
  body: unknown;
  fault: SoapFault | null;
};

export function parseSoapResponse(xml: string): ParsedSoapResponse {
  const parsed = parser.parse(xml) as unknown;
  const envelope = objectValue(parsed, "Envelope");
  const body = objectValue(envelope, "Body");
  if (!body) {
    throw new Error("SOAP response has no Envelope/Body");
  }

  const fault = objectValue(body, "Fault");
  return {
    body,
    fault: fault ? parseFault(fault) : null
  };
}
