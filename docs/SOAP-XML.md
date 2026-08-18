# SOAP / XML Adapter Boundary

v0.4 adds a provider-neutral SOAP-over-HTTP connector without embedding any real vendor WSDL, credentials or production schema.

## Supported reference behaviour

- SOAP 1.1 envelopes and `SOAPAction` headers.
- SOAP 1.2 envelopes and action parameter in `application/soap+xml`.
- XML values generated through an XML builder rather than string concatenation.
- XML parsing with custom entity processing disabled.
- SOAP 1.1 and SOAP 1.2 `Fault` normalization.
- server-configured endpoint only;
- redirects disabled;
- per-request timeout;
- maximum response-size enforcement;
- correlation ID propagated as an HTTP header.

## Boundary

```text
provider-neutral SoapRequest
        |
        v
     SoapConnector
        |
        v
  SoapHttpConnector
        |
  +-----+---------------------------+
  | envelope / namespace / action  |
  | timeout / response size        |
  | secure XML parsing             |
  | Fault normalization            |
  +-----+---------------------------+
        |
        v
 provider SOAP endpoint
```

A real integration should wrap the generic connector in a **provider adapter** that owns its operation names, namespaces, authentication headers, DTO mapping and business semantics.

## XML security

The reference parser uses `processEntities: false`. This prevents custom XML entities from being expanded during parsing and avoids making external entity/DOCTYPE behaviour part of the application contract.

Additional production controls should include:

1. explicit request/response size limits at the reverse proxy and application;
2. provider allowlisting and fixed endpoint configuration;
3. strict operation-specific mapping rather than exposing arbitrary operation names to public callers;
4. separate schema/business validation after XML parsing;
5. no logging of full XML when it may contain credentials or personal data;
6. timeouts appropriate to the provider SLA;
7. durable audit/provenance records outside raw transport logs.

## Endpoint configuration

```text
SOAP_ENDPOINT=
SOAP_TIMEOUT_MS=5000
SOAP_MAX_RESPONSE_BYTES=1048576
```

`SOAP_ENDPOINT` must be configured server-side and must use HTTP or HTTPS. Embedded username/password credentials in the URL are rejected.

## Retry policy

The generic SOAP connector deliberately **does not retry automatically**. Many SOAP operations are state-changing and their idempotency semantics are provider-specific.

If a provider supports safe retries, implement them one layer above the generic connector using a stable business/idempotency key, classified failures and a bounded job/replay policy. v0.5 will provide the reusable job/replay layer for that purpose.

## Fictional demo

With the demo flags enabled and `SOAP_ENDPOINT` pointed at the local demo target:

```text
POST /v1/demo/soap
POST /v1/demo-soap-target
```

The target can return either a successful `PingResponse` or a fictional SOAP 1.1 `Fault`. These routes exist only for CI/local demonstrations and must stay disabled in production.
