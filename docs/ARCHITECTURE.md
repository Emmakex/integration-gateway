# Architecture

Integration Gateway uses explicit capability boundaries so transport code and vendor payloads do not leak into business-facing application services.

```text
HTTP / webhook / job input
          |
          v
   Fastify routes
          |
          v
 application services
          |
          v
 repository / connector ports
          |
   +------+------+------+
   |             |      |
 in-memory      REST   SOAP
   demo        adapter adapter
```

## v0.1 boundaries

- `domain/` contains provider-neutral integration event types.
- `repositories/` defines stable storage/capability interfaces.
- `services/` owns validation and orchestration.
- `adapters/` contains infrastructure-specific implementations.
- `app.ts` owns HTTP transport and route schemas.
- `server.ts` owns process startup and graceful shutdown only.

## Trust rules

1. External payloads are untrusted until validated.
2. Credentials never enter domain objects or browser-visible configuration.
3. Vendor-specific field names should be translated inside adapters/mappers.
4. Correlation IDs are propagated across integration steps.
5. Future webhook handlers must verify authenticity before idempotency/business processing.
6. Future retry logic must distinguish retryable transport failures from permanent validation/business failures.
7. Production persistence must replace the in-memory adapter before real integration events are accepted.

The in-memory adapter exists only for local development, examples and CI smoke tests.
