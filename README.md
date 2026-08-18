# Integration Gateway

> Reusable backend starter for REST APIs, signed webhooks, enterprise adapters and integration workflows.

Integration Gateway is a clean-room TypeScript backend designed to demonstrate reliable integration patterns without coupling the application to a specific CRM, ERP, booking engine, payment provider or vendor API.

The repository remains private while the remaining milestones are validated. The public 1.0 release will contain only fictional examples, generic adapters and reusable integration patterns.

![Version](https://img.shields.io/badge/version-0.3.0-0d1b2d)
![Node](https://img.shields.io/badge/Node-24.12%2B-5fa04e)
![Fastify](https://img.shields.io/badge/Fastify-5.10.0-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178c6)
![License](https://img.shields.io/badge/license-MIT-45d6b5)

## What v0.3 includes

### Foundation

- Fastify service with `/health` and `/ready`.
- Provider-neutral `IntegrationEvent` domain.
- Repository / adapter / service boundaries.
- Graceful process shutdown.
- Strict TypeScript and GitHub Actions CI.

### Signed inbound webhooks

- route-scoped raw-body capture;
- timestamped HMAC-SHA256 signatures;
- constant-time signature comparison;
- stale/future request rejection;
- mandatory idempotency keys;
- completed delivery replay without repeating business logic;
- correlation ID propagation;
- accepted/replayed/rejected/in-progress audit records;
- demo audit endpoint disabled by default.

### Outbound REST connectors

- provider-neutral `OutboundConnector` boundary;
- server-configured base URL only;
- relative-path/origin validation to avoid arbitrary proxy behaviour;
- redirects disabled;
- per-attempt timeout;
- explicit failure classification;
- bounded exponential backoff;
- `Retry-After` support with a configured cap;
- safe automatic retries for `408`, `429`, `5xx`, timeout and network failures;
- `POST`/`PATCH` retries only when an idempotency key is supplied;
- opt-in fictional route that validates a real `503 → 503 → 200` retry sequence in CI.

The bundled repositories and demo targets are in-memory/local examples only. Durable persistence, provider-specific authentication and production observability must be supplied by real adapters.

## Architecture

```text
                      external systems
                     /               \
                    /                 \
             signed webhook       outbound REST
                  |                    ^
                  v                    |
       raw body + HMAC + time      connector port
                  |                    |
         idempotency claim             |
                  |                    |
                  +--------+-----------+
                           |
                           v
                  application services
                           |
                           v
                repository / adapter ports
                           |
                demo / REST / SOAP / jobs
```

Provider-specific field names, URLs and credentials belong inside configuration/adapters rather than routes or domain models.

Read:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md)
- [`docs/OUTBOUND-REST.md`](docs/OUTBOUND-REST.md)

## Quick start

Requires **Node.js 24.12+**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default local URL: `http://127.0.0.1:3001`.

Webhook ingestion remains disabled until `WEBHOOK_SIGNING_SECRET` is configured. Outbound REST remains disabled until `OUTBOUND_BASE_URL` is configured. Demo endpoints remain disabled unless explicitly enabled.

## Main routes

```text
GET  /health
GET  /ready
POST /v1/integration-events
GET  /v1/integration-events
GET  /v1/integration-events/:id
POST /v1/webhooks/:source/:eventType
GET  /v1/webhook-audit             # opt-in demo/read endpoint
POST /v1/demo/outbound             # opt-in demo only
ANY  /v1/demo-target/retryable     # opt-in fictional retry target
```

## Webhook reference protocol

```text
x-integration-timestamp: <unix-seconds>
x-integration-signature: v1=<hmac-sha256-hex>
x-idempotency-key: <stable-provider-event-id>
x-correlation-id: <optional-correlation-id>
```

Signature input:

```text
<timestamp>.<exact-raw-request-body>
```

See [`docs/WEBHOOKS.md`](docs/WEBHOOKS.md).

## Outbound retry model

Retryable failures include network errors, timeouts, HTTP `408`, `429` and `5xx`. Ordinary `4xx` responses are permanent by default.

Naturally idempotent methods (`GET`, `PUT`, `DELETE`) may be retried. `POST` and `PATCH` require an explicit idempotency key before automatic retries are permitted.

See [`docs/OUTBOUND-REST.md`](docs/OUTBOUND-REST.md).

## Quality checks

```bash
npm run check:safety
npm test
npm run typecheck
npm run build
npm audit --audit-level=high
```

CI validates unit tests, TypeScript, the compiled server, signed webhook acceptance/replay/rejection and a real bounded outbound retry flow.

## Roadmap

| Version | Focus | Status |
|---|---|---|
| `0.1.0` | Fastify foundation, health/readiness, integration domain and CI | Done |
| `0.2.0` | Signed inbound webhooks, idempotency and audit trail | Done |
| `0.3.0` | Outbound REST connectors, retries and failure classification | Current |
| `0.4.0` | SOAP/XML adapter boundary and mapping examples | Planned |
| `0.5.0` | Background jobs, dead-letter/replay workflow and observability | Planned |
| `1.0.0` | Stable reusable integration starter | Planned |

## Principles

- Clean-room implementation and fictional payloads only.
- External systems live behind explicit adapters.
- Secrets and remote base URLs are server-only configuration.
- Webhook authenticity is verified against the exact raw body before processing.
- Idempotency is established before retryable writes.
- Outbound retries are bounded and classification-driven.
- User-supplied arbitrary destination URLs are never accepted.
- Integration events and state changes are auditable.
- No client/customer production code, endpoints or credentials.

## Security and contributing

See [`SECURITY.md`](SECURITY.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT © 2026 Eduardo Yauri. See [`LICENSE`](LICENSE).
