# Architecture

Integration Gateway uses explicit capability boundaries so transport code and vendor payloads do not leak into business-facing application services.

```text
Inbound side                              Outbound side
-----------                               -------------
HTTP / signed webhook                     application service
        |                                        |
        v                                        v
   Fastify routes                         OutboundConnector
        |                                        |
        +-- normal REST                          +-- base URL from server config
        |                                        +-- validated relative path
        +-- webhook trust boundary               +-- timeout / retry policy
              |                                  +-- failure classification
              raw body + timestamp + HMAC        |
              |                                  v
              idempotency claim             external REST API
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

- `domain/` contains provider-neutral integration, webhook/audit and outbound result types.
- `repositories/` defines stable storage/capability interfaces.
- `services/` owns validation and orchestration.
- `security/` contains provider-neutral security primitives such as HMAC verification.
- `adapters/` contains infrastructure-specific implementations, including outbound HTTP.
- `app.ts` owns HTTP transport, route schemas and demo-only surfaces.
- `server.ts` owns process startup and graceful shutdown only.

## Inbound webhook ordering

Authenticity is established before idempotent business processing:

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

The reference REST path establishes configuration and retry safety before a network operation is repeated:

```text
application request
  → connector path/origin validation
  → determine whether method is retry-safe
  → attempt with timeout
  → classify response/failure
  → stop OR bounded backoff/retry
  → normalized OutboundResult
```

The base URL is server configuration and the caller supplies only a relative path selected by application code/adapters. Absolute or scheme-relative destinations are rejected, redirects are disabled and provider authentication belongs in dedicated adapters.

`POST` and `PATCH` are not automatically retried unless an idempotency key is present. See [`OUTBOUND-REST.md`](OUTBOUND-REST.md).

## Trust rules

1. External payloads are untrusted until validated.
2. Credentials never enter domain objects or browser/client-visible configuration.
3. Vendor-specific field names should be translated inside adapters/mappers.
4. Correlation IDs are propagated across integration steps.
5. Webhook authenticity is verified against the exact raw body before business processing.
6. Idempotency must become atomic/durable before multi-instance production use.
7. Retry logic distinguishes transient transport failures from permanent client/business failures.
8. Outbound destinations are selected by server configuration/adapters, never arbitrary request URLs.
9. Redirect following stays disabled unless a provider-specific adapter has a reviewed reason to enable it.
10. Production persistence must replace in-memory adapters before real integration events are accepted.
11. Audit/demo APIs are not public operational dashboards unless separately authenticated and authorized.

The bundled in-memory adapters and retry target exist only for local development, examples and CI.
