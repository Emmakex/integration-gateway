# Architecture

Integration Gateway uses explicit capability boundaries so transport code and vendor payloads do not leak into business-facing application services.

```text
HTTP / signed webhook / future job input
                |
                v
          Fastify routes
                |
       +--------+---------+
       |                  |
normal REST       webhook trust boundary
       |                  |
       |          raw body + timestamp + HMAC
       |                  |
       |             idempotency claim
       |                  |
       +--------+---------+
                |
                v
       application services
                |
                v
     repository / connector ports
                |
       +--------+--------+
       |        |        |
    in-memory  REST     SOAP
      demo    adapter  adapter
```

## Capability boundaries

- `domain/` contains provider-neutral integration and webhook/audit types.
- `repositories/` defines stable storage/capability interfaces.
- `services/` owns validation and orchestration.
- `security/` contains provider-neutral security primitives such as HMAC verification.
- `adapters/` contains infrastructure-specific implementations.
- `app.ts` owns HTTP transport, raw-body integration and response mapping.
- `server.ts` owns process startup and graceful shutdown only.

## Webhook ordering

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

See [`WEBHOOKS.md`](WEBHOOKS.md) for the signed reference protocol.

## Trust rules

1. External payloads are untrusted until validated.
2. Credentials never enter domain objects or browser-visible configuration.
3. Vendor-specific field names should be translated inside adapters/mappers.
4. Correlation IDs are propagated across integration steps.
5. Webhook authenticity is verified against the exact raw body before business processing.
6. Idempotency must become atomic/durable before multi-instance production use.
7. Retry logic must distinguish retryable transport failures from permanent validation/business failures.
8. Production persistence must replace in-memory adapters before real integration events are accepted.
9. Audit APIs are not public operational dashboards unless separately authenticated and authorized.

The bundled in-memory adapters exist only for local development, examples and CI smoke tests.
