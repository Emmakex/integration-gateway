import type { FastifyInstance } from "fastify";
import type { SoapDemoService } from "../services/soap-demo-service.ts";

const SOAP_11_SUCCESS = `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><m:PingResponse xmlns:m="urn:integration-gateway:demo"><result>pong</result></m:PingResponse></soap:Body></soap:Envelope>`;

const SOAP_11_FAULT = `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultcode>soap:Server</faultcode><faultstring>Fictional demo fault</faultstring><detail><code>DEMO_FAULT</code></detail></soap:Fault></soap:Body></soap:Envelope>`;

export function registerSoapContentTypeParsers(app: FastifyInstance): void {
  app.addContentTypeParser(
    ["text/xml", "application/soap+xml"],
    { parseAs: "string" },
    (_request, body, done) => done(null, body)
  );
}

export function registerDemoSoapTarget(app: FastifyInstance): void {
  app.post<{ Body: string }>("/v1/demo-soap-target", async (request, reply) => {
    const shouldFault = request.body.includes("<mode>fault</mode>");
    const xml = shouldFault ? SOAP_11_FAULT : SOAP_11_SUCCESS;
    return reply
      .code(shouldFault ? 500 : 200)
      .type("text/xml; charset=utf-8")
      .send(xml);
  });
}

export function registerDemoSoapApi(app: FastifyInstance, service: SoapDemoService): void {
  app.post<{ Body: { mode?: "success" | "fault" } }>(
    "/v1/demo/soap",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: { type: "string", enum: ["success", "fault"] }
          }
        }
      }
    },
    async (request, reply) => {
      const result = await service.ping(request.body.mode ?? "success");
      return reply.code(result.ok ? 200 : result.kind === "fault" ? 502 : 503).send(result);
    }
  );
}
