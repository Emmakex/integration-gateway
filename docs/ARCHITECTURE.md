# Architecture

Integration Gateway uses explicit capability boundaries so transport code and vendor payloads do not leak into business-facing application services.

```text
Inbound side                               Outbound side
------------                               -------------
HTTP / signed webhook                      application service
        |                                         |
        v                               +---------+---------+
   Fastify routes                       |                   |
        |                         OutboundConnector     SoapConnector
        +-- normal REST                  |                   |
        |                         REST adapter         SOAP HTTP adapter
        +-- webhook trust boundary       |                   |
              |                          v                   v
              raw body + HMAC       external REST      external SOAP
              |
              idempotency claim
              |
              +------------------+
                                 |
                                 v
                        application services
                                 |
                                 v
                     repository / adapter ports
                                 |
                      demo / REST / SOAP / jobs
```

## Capability boundaries

- `domain/` contains provider-neutral integration, webhook/audit, REST outbound and SOAP result types.
- `repositories/` defines stable storage/capability interfaces, including `OutboundConnector` and `SoapConnector`.
- `services/` owns validation and orchestration.
- `security/` contains provider-neutral security primitives such as HMAC verification.
- `xml/` contains generic SOAP envelope parsing/building rules.
- `adapters/` contains infrastructure-specific implementations, including outbound REST and SOAP/HTTP.
- `app.ts` owns HTTP transport, route schemas and demo-only surfaces.
- `server.ts` owns process startup and graceful shutdown only.

## Inbound webhook ordering

```text
raw request
  → timestamp/HMAC verification
  → atomic idempotency claim
  → application event
  → claim completion
  → audit record
```

Completed duplicate keys replay the original event. A duplicate while processing is blocked. Failed new processing releases the process-local demo claim for retry.

See [`WEBHOOKS.md`](WEBHOOKS.md).

## Outbound REST ordering

```text
application request
  → connector path/origin validation
  → determine whether method is retry-safe
  → attempt with timeout
  → classify response/failure
  → stop OR bounded backoff/retry
  → normalized OutboundResult
```

The base URL is server configuration and the caller supplies only a relative path selected by application code/adapters. Absolute or scheme-relative destinations are rejected and redirects are disabled.

See [`OUTBOUND-REST.md`](OUTBOUND-REST.md).

## SOAP / XML ordering

```text
provider adapter request
  → validate operation / namespace
  → build escaped SOAP envelope
  → POST to fixed server-configured endpoint
  → enforce timeout + response-size limit
  → parse XML with entity processing disabled
  → normalize SOAP Fault OR response body
  → SoapResult
```

The generic SOAP connector supports SOAP 1.1 and 1.2 transport conventions but does not know any vendor WSDL or business schema. A provider adapter should own operation names, namespaces, authentication and DTO mapping.

Automatic SOAP retries are deliberately absent because operation idempotency is provider-specific. See [`SOAP-XML.md`](SOAP-XML.md).

## Trust rules

1. External payloads are untrusted until validated.
2. Credentials never enter domain objects or client-visible configuration.
3. Vendor-specific field names should be translated inside adapters/mappers.
4. Correlation IDs are propagated across integration steps.
5. Webhook authenticity is verified against the exact raw body before business processing.
6. Idempotency must become atomic/durable before multi-instance production use.
7. Retry logic distinguishes transient transport failures from permanent client/business failures.
8. Outbound destinations are selected by server configuration/adapters, never arbitrary request URLs.
9. Redirect following stays disabled by default.
10. XML custom entity expansion is disabled in the generic parser.
11. SOAP responses are bounded by a configured maximum size before parsing completes.
12. Production persistence must replace in-memory adapters before real integration events are accepted.
13. Audit/demo APIs are not public operational dashboards unless separately authenticated and authorized.

The bundled in-memory adapters and fictional targets exist only for local development, examples and CI.
