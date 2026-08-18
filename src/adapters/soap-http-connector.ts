import type { SoapRequest, SoapResult } from "../domain/soap.ts";
import type { SoapConnector } from "../repositories/soap-connector.ts";
import { buildSoapEnvelope, parseSoapResponse } from "../xml/soap-envelope.ts";

type FetchLike = typeof fetch;

type SoapHttpConnectorOptions = {
  endpoint: string;
  timeoutMs: number;
  maxResponseBytes: number;
  fetchFn?: FetchLike;
};

class ResponseTooLargeError extends Error {
  constructor() {
    super("SOAP response exceeded configured size limit");
    this.name = "ResponseTooLargeError";
  }
}

function safeAction(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/[
\"]/.test(trimmed)) {
    throw new Error("SOAP action contains unsupported header characters");
  }
  return trimmed;
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const declared = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ResponseTooLargeError();
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ResponseTooLargeError();
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

export class SoapHttpConnector implements SoapConnector {
  private readonly endpoint: URL;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly fetchFn: FetchLike;

  constructor(options: SoapHttpConnectorOptions) {
    const endpoint = new URL(options.endpoint);
    if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
      throw new Error("SOAP endpoint must use http or https");
    }
    if (endpoint.username || endpoint.password) {
      throw new Error("SOAP endpoint must not embed credentials");
    }
    if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1) {
      throw new Error("SOAP timeout must be a positive integer");
    }
    if (!Number.isInteger(options.maxResponseBytes) || options.maxResponseBytes < 1024) {
      throw new Error("SOAP maxResponseBytes must be at least 1024 bytes");
    }

    this.endpoint = endpoint;
    this.timeoutMs = options.timeoutMs;
    this.maxResponseBytes = options.maxResponseBytes;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async send(request: SoapRequest): Promise<SoapResult> {
    let xml: string;
    let action: string | null;

    try {
      xml = buildSoapEnvelope(request);
      action = safeAction(request.action);
    } catch (error) {
      return {
        ok: false,
        kind: "configuration",
        statusCode: null,
        message: error instanceof Error ? error.message : "Invalid SOAP request configuration",
        fault: null
      };
    }

    const headers = new Headers({
      accept: request.version === "1.1" ? "text/xml" : "application/soap+xml",
      "x-correlation-id": request.correlationId
    });

    if (request.version === "1.1") {
      headers.set("content-type", "text/xml; charset=utf-8");
      if (action) headers.set("soapaction", `"${action}"`);
    } else {
      const contentType = action
        ? `application/soap+xml; charset=utf-8; action="${action}"`
        : "application/soap+xml; charset=utf-8";
      headers.set("content-type", contentType);
    }

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: "POST",
        headers,
        body: xml,
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: "error"
      });

      let responseXml: string;
      try {
        responseXml = await readLimitedText(response, this.maxResponseBytes);
      } catch (error) {
        if (error instanceof ResponseTooLargeError) {
          return {
            ok: false,
            kind: "response_too_large",
            statusCode: response.status,
            message: error.message,
            fault: null
          };
        }
        throw error;
      }

      let parsed;
      try {
        parsed = parseSoapResponse(responseXml);
      } catch {
        return {
          ok: false,
          kind: "invalid_xml",
          statusCode: response.status,
          message: "Remote service returned an invalid SOAP XML response",
          fault: null
        };
      }

      if (parsed.fault) {
        return {
          ok: false,
          kind: "fault",
          statusCode: response.status,
          message: parsed.fault.reason ?? "Remote SOAP service returned a fault",
          fault: parsed.fault
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          kind: "http",
          statusCode: response.status,
          message: `Remote SOAP service returned HTTP ${response.status}`,
          fault: null
        };
      }

      return {
        ok: true,
        statusCode: response.status,
        body: parsed.body
      };
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        return {
          ok: false,
          kind: "timeout",
          statusCode: null,
          message: "SOAP request timed out",
          fault: null
        };
      }

      return {
        ok: false,
        kind: "network",
        statusCode: null,
        message: "SOAP network request failed",
        fault: null
      };
    }
  }
}
