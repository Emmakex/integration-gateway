import assert from "node:assert/strict";
import test from "node:test";
import { buildSoapEnvelope, parseSoapResponse } from "../src/xml/soap-envelope.ts";

test("builds a SOAP 1.1 envelope with escaped values", () => {
  const xml = buildSoapEnvelope({
    version: "1.1",
    operation: "CreateThing",
    namespace: "urn:demo:things",
    correlationId: "corr-1",
    action: "urn:demo:things/CreateThing",
    payload: {
      name: "A & B <demo>",
      quantity: 2
    }
  });

  assert.match(xml, /schemas\.xmlsoap\.org\/soap\/envelope/);
  assert.match(xml, /<m:CreateThing/);
  assert.match(xml, /A &amp; B &lt;demo&gt;/);
});

test("builds a SOAP 1.2 envelope", () => {
  const xml = buildSoapEnvelope({
    version: "1.2",
    operation: "Ping",
    namespace: "urn:demo:ping",
    correlationId: "corr-2",
    payload: { value: "hello" }
  });

  assert.match(xml, /www\.w3\.org\/2003\/05\/soap-envelope/);
  assert.match(xml, /<m:Ping/);
});

test("parses SOAP 1.1 faults", () => {
  const parsed = parseSoapResponse(`<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultcode>soap:Server</faultcode><faultstring>Demo failure</faultstring><detail><code>DEMO</code></detail></soap:Fault></soap:Body></soap:Envelope>`);

  assert.equal(parsed.fault?.code, "soap:Server");
  assert.equal(parsed.fault?.reason, "Demo failure");
});

test("parses SOAP 1.2 faults", () => {
  const parsed = parseSoapResponse(`<?xml version="1.0"?><env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope"><env:Body><env:Fault><env:Code><env:Value>env:Receiver</env:Value></env:Code><env:Reason><env:Text>Demo 1.2 failure</env:Text></env:Reason><env:Detail><code>DEMO12</code></env:Detail></env:Fault></env:Body></env:Envelope>`);

  assert.equal(parsed.fault?.code, "env:Receiver");
  assert.equal(parsed.fault?.reason, "Demo 1.2 failure");
});

test("does not expand custom XML entities", () => {
  assert.throws(() => parseSoapResponse(`<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe "expanded">]><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><value>&xxe;</value></soap:Body></soap:Envelope>`));
});
